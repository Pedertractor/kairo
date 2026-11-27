import type { FastifyInstance } from 'fastify';
import { AdminDashboardController } from '../controllers/admin-dashboard.controller.js';
import { createRequireAdmin } from '../middleware/require-admin.js';
import { AbsenceRepository } from '../repositories/absence.repository.js';
import { AdminDashboardRepository } from '../repositories/admin-dashboard.repository.js';
import { CardHistoryRepository } from '../repositories/card-history.repository.js';
import { CardRepository } from '../repositories/card.repository.js';
import { ShiftRepository } from '../repositories/shift.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { AbsenceService } from '../services/absence.service.js';
import { AdminDashboardService } from '../services/admin-dashboard.service.js';
import { AdminLeaderTimelineService } from '../services/admin-leader-timeline.service.js';
import { TimeEntryService } from '../services/time-entry.service.js';

export async function adminDashboardRoutes(app: FastifyInstance) {
  const userRepository = new UserRepository(app.prisma);
  const requireAdmin = createRequireAdmin(userRepository);
  const dashboardRepository = new AdminDashboardRepository(app.prisma);
  const timeEntryRepository = new TimeEntryRepository(app.prisma);
  const taskRepository = new TaskRepository(app.prisma);
  const cardRepository = new CardRepository(app.prisma);
  const timeEntryService = new TimeEntryService(
    timeEntryRepository,
    cardRepository,
    new TeamRepository(app.prisma),
    taskRepository,
    userRepository,
    new AbsenceService(
      userRepository,
      new AbsenceRepository(app.prisma),
      timeEntryRepository,
      taskRepository,
      cardRepository,
    ),
    new CardHistoryRepository(app.prisma),
  );
  const controller = new AdminDashboardController(
    new AdminDashboardService(dashboardRepository, new ShiftRepository(app.prisma)),
    new AdminLeaderTimelineService(dashboardRepository, timeEntryService),
  );

  app.get(
    '/admin/dashboard',
    { preHandler: [app.authenticate, requireAdmin] },
    controller.getDashboard,
  );
  app.get(
    '/admin/dashboard/leaders',
    { preHandler: [app.authenticate, requireAdmin] },
    controller.listLeaders,
  );
  app.get(
    '/admin/dashboard/leaders/:leaderId/day',
    { preHandler: [app.authenticate, requireAdmin] },
    controller.getLeaderDay,
  );
}
