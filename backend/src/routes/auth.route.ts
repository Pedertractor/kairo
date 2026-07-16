import type { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/auth.controller.js';
import { AuthService } from '../services/auth.service.js';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository.js';
import { UserRepository } from '../repositories/user.repository.js';

export async function authRoutes(app: FastifyInstance) {
  const controller = new AuthController(
    new AuthService(
      new UserRepository(app.prisma),
      new RefreshTokenRepository(app.prisma),
    ),
  );

  app.post('/auth/login', controller.login);
  app.post('/auth/change-password', controller.changePassword);
  app.post('/auth/refresh', controller.refresh);
  app.get('/auth/me', { preHandler: [app.authenticate] }, controller.me);
  app.post('/auth/logout', { preHandler: [app.authenticate] }, controller.logout);
}
