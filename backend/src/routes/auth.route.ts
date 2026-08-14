import type { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/auth.controller.js';
import { AbsenceRepository } from '../repositories/absence.repository.js';
import { CardRepository } from '../repositories/card.repository.js';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { AbsenceService } from '../services/absence.service.js';
import { AuthService } from '../services/auth.service.js';

export async function authRoutes(app: FastifyInstance) {
  const userRepository = new UserRepository(app.prisma);
  const controller = new AuthController(
    new AuthService(
      userRepository,
      new RefreshTokenRepository(app.prisma),
      new AbsenceService(
        userRepository,
        new AbsenceRepository(app.prisma),
        new TimeEntryRepository(app.prisma),
        new TaskRepository(app.prisma),
        new CardRepository(app.prisma),
      ),
    ),
  );

  app.post('/auth/login', controller.login);
  app.post('/auth/change-password', controller.changePassword);
  app.post('/auth/refresh', controller.refresh);
  app.get('/auth/me', { preHandler: [app.authenticate] }, controller.me);
  app.patch(
    '/auth/me/absent',
    { preHandler: [app.authenticate] },
    controller.updateAbsent,
  );
  app.post('/auth/logout', { preHandler: [app.authenticate] }, controller.logout);
}
