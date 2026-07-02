import type { FastifyInstance } from 'fastify';
import { UserController } from '../controllers/user.controller.js';
import { createRequireAdmin } from '../middleware/require-admin.js';
import { UserRepository } from '../repositories/user.repository.js';
import { UserService } from '../services/user.service.js';

export async function userRoutes(app: FastifyInstance) {
  const userRepository = new UserRepository(app.prisma);
  const requireAdmin = createRequireAdmin(userRepository);
  const controller = new UserController(new UserService(userRepository));

  app.get('/users', { preHandler: [app.authenticate, requireAdmin] }, controller.list);
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
