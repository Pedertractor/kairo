import type { FastifyInstance } from 'fastify';
import { AbsenceController } from '../controllers/absence.controller.js';
import { createRequireAdmin } from '../middleware/require-admin.js';
import { AbsenceRepository } from '../repositories/absence.repository.js';
import { CardRepository } from '../repositories/card.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { AbsenceService } from '../services/absence.service.js';

export async function absenceRoutes(app: FastifyInstance) {
  const userRepository = new UserRepository(app.prisma);
  const requireAdmin = createRequireAdmin(userRepository);
  const controller = new AbsenceController(
    new AbsenceService(
      userRepository,
      new AbsenceRepository(app.prisma),
      new TimeEntryRepository(app.prisma),
      new TaskRepository(app.prisma),
      new CardRepository(app.prisma),
    ),
  );
  const auth = { preHandler: [app.authenticate] };
  const adminAuth = { preHandler: [app.authenticate, requireAdmin] };

  app.get('/absences', auth, controller.list);
  app.get('/absences/admin', adminAuth, controller.listAdmin);
  app.get('/absences/unseen-count', auth, controller.unseenCount);
  app.post('/absences/seen', auth, controller.markSeen);
  app.post('/absences', auth, controller.create);
  app.patch('/absences/admin/:id', adminAuth, controller.updateAdmin);
  app.delete('/absences/admin/:id', adminAuth, controller.deleteAdmin);
  app.delete('/absences/:id', auth, controller.cancel);
}
