import type { FastifyInstance } from 'fastify';
import { AdminTimeEntryController } from '../controllers/admin-time-entry.controller.js';
import { createRequireAdmin } from '../middleware/require-admin.js';
import { AdminTimeEntryRepository } from '../repositories/admin-time-entry.repository.js';
import { CardRepository } from '../repositories/card.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { AdminTimeEntryService } from '../services/admin-time-entry.service.js';
import { releaseActivityIfIdle } from '../services/card-status-sync.js';
import { releaseTaskIfIdle } from '../services/task-status-sync.js';

/**
 * Admin-only management of any collaborator's time entries.
 *
 * Access is enforced in layers: an encapsulated preHandler hook that every
 * route in this plugin inherits, the same guards repeated on each route, the
 * service re-checking the actor, and the write transaction re-reading the
 * actor under a row lock.
 */
export async function adminTimeEntryRoutes(app: FastifyInstance) {
  const userRepository = new UserRepository(app.prisma);
  const requireAdmin = createRequireAdmin(userRepository);
  const timeEntryRepository = new TimeEntryRepository(app.prisma);
  const cardRepository = new CardRepository(app.prisma);
  const taskRepository = new TaskRepository(app.prisma);

  const controller = new AdminTimeEntryController(
    new AdminTimeEntryService(
      userRepository,
      new AdminTimeEntryRepository(app.prisma),
      async (item, actorId) => {
        await releaseActivityIfIdle(
          timeEntryRepository,
          cardRepository,
          item.cardId,
          actorId,
        );
        await releaseTaskIfIdle(timeEntryRepository, taskRepository, item.taskId);
      },
    ),
  );

  // Layer 1: applies to every route registered in this (encapsulated) plugin,
  // including any added later that forgets its own guard. onRequest runs
  // before body parsing, so non-admins are turned away before any payload
  // is even read.
  app.addHook('onRequest', app.authenticate);
  app.addHook('onRequest', requireAdmin);

  // Layer 2: explicit per-route guard, so moving a route out keeps it closed.
  const adminAuth = { preHandler: [app.authenticate, requireAdmin] };

  app.get('/admin/time-entries', adminAuth, controller.list);
  app.get('/admin/time-entries/users', adminAuth, controller.listUsers);
  app.get('/admin/time-entries/work-items', adminAuth, controller.searchWorkItems);
  app.get('/admin/time-entries/:timeEntryId/audit', adminAuth, controller.getAudit);
  app.post('/admin/time-entries', adminAuth, controller.create);
  app.patch('/admin/time-entries/:timeEntryId', adminAuth, controller.update);
  app.delete('/admin/time-entries/:timeEntryId', adminAuth, controller.remove);
}
