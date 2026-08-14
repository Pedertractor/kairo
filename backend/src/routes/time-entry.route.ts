import type { FastifyInstance } from 'fastify';
import { TimeEntryController } from '../controllers/time-entry.controller.js';
import { AbsenceRepository } from '../repositories/absence.repository.js';
import { CardRepository } from '../repositories/card.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { AbsenceService } from '../services/absence.service.js';
import { TimeEntryService } from '../services/time-entry.service.js';

export async function timeEntryRoutes(app: FastifyInstance) {
  const userRepository = new UserRepository(app.prisma);
  const timeEntryRepository = new TimeEntryRepository(app.prisma);
  const taskRepository = new TaskRepository(app.prisma);
  const cardRepository = new CardRepository(app.prisma);
  const absenceService = new AbsenceService(
    userRepository,
    new AbsenceRepository(app.prisma),
    timeEntryRepository,
    taskRepository,
    cardRepository,
  );
  const controller = new TimeEntryController(
    new TimeEntryService(
      timeEntryRepository,
      cardRepository,
      new TeamRepository(app.prisma),
      taskRepository,
      userRepository,
      absenceService,
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
  app.get(
    '/teams/:teamId/time-entries',
    { preHandler: [app.authenticate] },
    controller.listTeamTimeEntries,
  );
  app.get(
    '/teams/:teamId/time-entries/day',
    { preHandler: [app.authenticate] },
    controller.getTeamDayDashboard,
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
  app.get(
    '/teams/:teamId/activities/:activityId/time-entries',
    { preHandler: [app.authenticate] },
    controller.listActivityTimeEntries,
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
