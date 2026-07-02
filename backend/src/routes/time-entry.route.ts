import type { FastifyInstance } from 'fastify';
import { TimeEntryController } from '../controllers/time-entry.controller.js';
import { CardRepository } from '../repositories/card.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { TimeEntryService } from '../services/time-entry.service.js';

export async function timeEntryRoutes(app: FastifyInstance) {
  const controller = new TimeEntryController(
    new TimeEntryService(
      new TimeEntryRepository(app.prisma),
      new CardRepository(app.prisma),
      new TeamRepository(app.prisma),
      new TaskRepository(app.prisma),
      new UserRepository(app.prisma),
    ),
  );

  app.get(
    '/time-entries/active',
    { preHandler: [app.authenticate] },
    controller.getActive,
  );
  app.get(
    '/time-entries/recent',
    { preHandler: [app.authenticate] },
    controller.getRecent,
  );
  app.get(
    '/time-entries',
    { preHandler: [app.authenticate] },
    controller.listUserTimeEntries,
  );
  app.patch(
    '/time-entries/:timeEntryId',
    { preHandler: [app.authenticate] },
    controller.updateUserTimeEntry,
  );
  app.get(
    '/time-entries/day',
    { preHandler: [app.authenticate] },
    controller.getDayDashboard,
  );
  app.post(
    '/time-entries/active/pause',
    { preHandler: [app.authenticate] },
    controller.pauseActive,
  );
  app.post(
    '/teams/:teamId/activities/:activityId/time-entries',
    { preHandler: [app.authenticate] },
    controller.startActivityTimer,
  );
  app.get(
    '/projects/:projectId/tasks/:taskId/time-entries',
    { preHandler: [app.authenticate] },
    controller.listTaskTimeEntries,
  );
  app.patch(
    '/projects/:projectId/tasks/:taskId/time-entries/:timeEntryId',
    { preHandler: [app.authenticate] },
    controller.updateTaskTimeEntry,
  );
  app.post(
    '/projects/:projectId/tasks/:taskId/time-entries',
    { preHandler: [app.authenticate] },
    controller.startTaskTimer,
  );
}
