import type { FastifyInstance } from 'fastify';
import { InfractionController } from '../controllers/infraction.controller.js';
import { createRequireAdmin } from '../middleware/require-admin.js';
import { createRequireAdminOrLeader } from '../middleware/require-admin-or-leader.js';
import { UserRepository } from '../repositories/user.repository.js';
import { InfractionService } from '../services/infraction.service.js';
import { InfractionLeaderRepository } from '../repositories/infraction-leader.repository.js';

export async function infractionRoutes(app: FastifyInstance) {
  const users = new UserRepository(app.prisma);
  const requireAdmin = createRequireAdmin(users);
  const requireAdminOrLeader = createRequireAdminOrLeader(users);
  const controller = new InfractionController(new InfractionService(), new InfractionLeaderRepository(app.prisma), users);

  app.get('/infractions/leaders', {
    preHandler: [app.authenticate, requireAdmin],
  }, controller.listLeaders);

  app.get('/infractions', {
    preHandler: [app.authenticate, requireAdminOrLeader],
  }, controller.getReport);
}
