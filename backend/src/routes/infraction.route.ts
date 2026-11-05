import type { FastifyInstance } from 'fastify';
import { InfractionController } from '../controllers/infraction.controller.js';
import { createRequireAdmin } from '../middleware/require-admin.js';
import { UserRepository } from '../repositories/user.repository.js';
import { InfractionService } from '../services/infraction.service.js';
import { InfractionLeaderRepository } from '../repositories/infraction-leader.repository.js';

export async function infractionRoutes(app: FastifyInstance) {
  const requireAdmin = createRequireAdmin(new UserRepository(app.prisma));
  const controller = new InfractionController(new InfractionService(), new InfractionLeaderRepository(app.prisma));

  app.get('/infractions/leaders', {
    preHandler: [app.authenticate, requireAdmin],
  }, controller.listLeaders);

  app.get('/infractions', {
    preHandler: [app.authenticate, requireAdmin],
  }, controller.getReport);
}
