import type { FastifyInstance } from 'fastify';
import { SupervisorController } from '../controllers/supervisor.controller.js';
import { UserRole } from '../generated/client.js';
import { createRequireAdmin } from '../middleware/require-admin.js';
import { createRequireRoles } from '../middleware/require-roles.js';
import { AbsenceRepository } from '../repositories/absence.repository.js';
import { CardRepository } from '../repositories/card.repository.js';
import { CostCenterRepository } from '../repositories/cost-center.repository.js';
import { HierarchyRepository } from '../repositories/hierarchy.repository.js';
import { ShiftRepository } from '../repositories/shift.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { AbsenceService } from '../services/absence.service.js';
import { ShiftService } from '../services/shift.service.js';
import { SupervisorService } from '../services/supervisor.service.js';
import { TeamService } from '../services/team.service.js';

export async function supervisorRoutes(app: FastifyInstance) {
  const userRepository = new UserRepository(app.prisma);
  const requireAdmin = createRequireAdmin(userRepository);
  const requireSupervisorOrAdmin = createRequireRoles(userRepository, [
    UserRole.ADMIN,
    UserRole.SUPERVISOR,
  ]);
  const absenceRepository = new AbsenceRepository(app.prisma);
  const timeEntryRepository = new TimeEntryRepository(app.prisma);
  const taskRepository = new TaskRepository(app.prisma);
  const cardRepository = new CardRepository(app.prisma);
  const teamService = new TeamService(
    new TeamRepository(app.prisma),
    userRepository,
    new AbsenceService(
      userRepository,
      absenceRepository,
      timeEntryRepository,
      taskRepository,
      cardRepository,
    ),
    absenceRepository,
    new CostCenterRepository(app.prisma),
    new ShiftService(new ShiftRepository(app.prisma)),
    timeEntryRepository,
    taskRepository,
    cardRepository,
  );
  const controller = new SupervisorController(
    new SupervisorService(new HierarchyRepository(app.prisma), teamService),
  );

  app.get(
    '/supervisor/supervisors',
    { preHandler: [app.authenticate, requireAdmin] },
    controller.listSupervisors,
  );
  app.get(
    '/supervisor/leaders',
    { preHandler: [app.authenticate, requireSupervisorOrAdmin] },
    controller.listLeaders,
  );
  app.get(
    '/supervisor/leaders/:leaderId/teams',
    { preHandler: [app.authenticate, requireSupervisorOrAdmin] },
    controller.listLeaderTeams,
  );
}
