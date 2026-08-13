import type { FastifyInstance } from 'fastify';
import { UserController } from '../controllers/user.controller.js';
import { createRequireAdminOrLeader } from '../middleware/require-admin-or-leader.js';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { UserService } from '../services/user.service.js';

export async function userRoutes(app: FastifyInstance) {
  const userRepository = new UserRepository(app.prisma);
  const teamRepository = new TeamRepository(app.prisma);
  const requireAdminOrLeader = createRequireAdminOrLeader(userRepository);
  const controller = new UserController(
    new UserService(
      userRepository,
      teamRepository,
      new RefreshTokenRepository(app.prisma),
      new TimeEntryRepository(app.prisma),
      new TaskRepository(app.prisma),
    ),
  );

  app.get(
    '/users',
    { preHandler: [app.authenticate, requireAdminOrLeader] },
    controller.list,
  );
  app.get(
    '/users/lookup/:unit/:cardNumber',
    { preHandler: [app.authenticate, requireAdminOrLeader] },
    controller.lookupEmployee,
  );
  app.post(
    '/users',
    { preHandler: [app.authenticate, requireAdminOrLeader] },
    controller.create,
  );
  app.patch(
    '/users/:id/role',
    { preHandler: [app.authenticate, requireAdminOrLeader] },
    controller.updateRole,
  );
  app.post(
    '/users/:id/reset-password',
    { preHandler: [app.authenticate, requireAdminOrLeader] },
    controller.resetPassword,
  );
  app.patch(
    '/users/:id/deactivate',
    { preHandler: [app.authenticate, requireAdminOrLeader] },
    controller.deactivate,
  );
  app.patch(
    '/users/:id/reactivate',
    { preHandler: [app.authenticate, requireAdminOrLeader] },
    controller.reactivate,
  );
}
