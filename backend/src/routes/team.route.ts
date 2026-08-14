import type { FastifyInstance } from 'fastify';
import { TeamController } from '../controllers/team.controller.js';
import { createRequireAdminOrLeader } from '../middleware/require-admin-or-leader.js';
import { AbsenceRepository } from '../repositories/absence.repository.js';
import { CardRepository } from '../repositories/card.repository.js';
import { CostCenterRepository } from '../repositories/cost-center.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { AbsenceService } from '../services/absence.service.js';
import { TeamService } from '../services/team.service.js';

export async function teamRoutes(app: FastifyInstance) {
  const userRepository = new UserRepository(app.prisma);
  const requireAdminOrLeader = createRequireAdminOrLeader(userRepository);
  const absenceRepository = new AbsenceRepository(app.prisma);
  const absenceService = new AbsenceService(
    userRepository,
    absenceRepository,
    new TimeEntryRepository(app.prisma),
    new TaskRepository(app.prisma),
    new CardRepository(app.prisma),
  );
  const controller = new TeamController(
    new TeamService(
      new TeamRepository(app.prisma),
      userRepository,
      absenceService,
      absenceRepository,
      new CostCenterRepository(app.prisma),
    ),
  );

  app.get('/teams', { preHandler: [app.authenticate] }, controller.list);
  app.get('/teams/:id', { preHandler: [app.authenticate] }, controller.getById);
  app.patch('/teams/:id', { preHandler: [app.authenticate] }, controller.update);
  app.get(
    '/teams/:id/cost-centers',
    { preHandler: [app.authenticate] },
    controller.listCostCenters,
  );
  app.put(
    '/teams/:id/cost-centers',
    { preHandler: [app.authenticate] },
    controller.setCostCenters,
  );
  app.get(
    '/teams/:id/available-members',
    { preHandler: [app.authenticate] },
    controller.listAvailableMembers,
  );
  app.post(
    '/teams/:id/members',
    { preHandler: [app.authenticate] },
    controller.addMember,
  );
  app.delete(
    '/teams/:id/members/:userId',
    { preHandler: [app.authenticate] },
    controller.removeMember,
  );
  app.patch(
    '/teams/:id/members/:userId/admin',
    { preHandler: [app.authenticate] },
    controller.promoteAdmin,
  );
  app.delete(
    '/teams/:id/members/:userId/admin',
    { preHandler: [app.authenticate] },
    controller.demoteAdmin,
  );
  app.patch(
    '/teams/:id/members/:userId/absent',
    { preHandler: [app.authenticate] },
    controller.updateMemberAbsent,
  );
  app.post(
    '/teams',
    { preHandler: [app.authenticate, requireAdminOrLeader] },
    controller.create,
  );
}
