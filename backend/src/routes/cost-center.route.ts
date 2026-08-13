import type { FastifyInstance } from 'fastify';
import { CostCenterController } from '../controllers/cost-center.controller.js';
import { createRequireAdminOrLeader } from '../middleware/require-admin-or-leader.js';
import { CostCenterRepository } from '../repositories/cost-center.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { CostCenterService } from '../services/cost-center.service.js';

export async function costCenterRoutes(app: FastifyInstance) {
  const requireAdminOrLeader = createRequireAdminOrLeader(
    new UserRepository(app.prisma),
  );
  const controller = new CostCenterController(
    new CostCenterService(new CostCenterRepository(app.prisma)),
  );

  app.get(
    '/cost-centers',
    { preHandler: [app.authenticate] },
    controller.list,
  );
  app.post(
    '/cost-centers/sync',
    { preHandler: [app.authenticate, requireAdminOrLeader] },
    controller.sync,
  );
}
