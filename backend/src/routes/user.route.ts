import type { FastifyInstance } from 'fastify';
import { UserController } from '../controllers/user.controller.js';
import { createRequireAdmin } from '../middleware/require-admin.js';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { UserService } from '../services/user.service.js';

export async function userRoutes(app: FastifyInstance) {
  const userRepository = new UserRepository(app.prisma);
  const requireAdmin = createRequireAdmin(userRepository);
  const controller = new UserController(
    new UserService(
      userRepository,
      new RefreshTokenRepository(app.prisma),
      new TimeEntryRepository(app.prisma),
      new TaskRepository(app.prisma),
    ),
  );

  app.get('/users', { preHandler: [app.authenticate, requireAdmin] }, controller.list);
  app.get(
    '/users/lookup/:unit/:cardNumber',
    { preHandler: [app.authenticate, requireAdmin] },
    controller.lookupEmployee,
  );
  app.post(
    '/users',
    { preHandler: [app.authenticate, requireAdmin] },
    controller.create,
  );
  app.patch(
    '/users/:id/role',
    { preHandler: [app.authenticate, requireAdmin] },
    controller.updateRole,
  );
  app.post(
    '/users/:id/reset-password',
    { preHandler: [app.authenticate, requireAdmin] },
    controller.resetPassword,
  );
  app.patch(
    '/users/:id/deactivate',
    { preHandler: [app.authenticate, requireAdmin] },
    controller.deactivate,
  );
  app.patch(
    '/users/:id/reactivate',
    { preHandler: [app.authenticate, requireAdmin] },
    controller.reactivate,
  );
}
