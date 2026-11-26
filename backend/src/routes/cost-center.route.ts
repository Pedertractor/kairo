import type { FastifyInstance } from 'fastify';
import { CostCenterController } from '../controllers/cost-center.controller.js';
import { createRequireAdmin } from '../middleware/require-admin.js';
import { CostCenterRepository } from '../repositories/cost-center.repository.js';
import { HierarchyRepository } from '../repositories/hierarchy.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { CostCenterService } from '../services/cost-center.service.js';

export async function costCenterRoutes(app: FastifyInstance) {
  // Sync can promote people to SUPERVISOR in bulk, so only admins may run it.
  const requireAdmin = createRequireAdmin(
    new UserRepository(app.prisma),
  );
  const controller = new CostCenterController(
    new CostCenterService(
      new CostCenterRepository(app.prisma),
      new HierarchyRepository(app.prisma),
    ),
  );

  app.get(
    '/cost-centers',
    { preHandler: [app.authenticate] },
    controller.list,
  );
  app.post(
    '/cost-centers/sync',
    { preHandler: [app.authenticate, requireAdmin] },
    controller.sync,
  );
}
