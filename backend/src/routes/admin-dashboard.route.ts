import type { FastifyInstance } from 'fastify';
import { AdminDashboardController } from '../controllers/admin-dashboard.controller.js';
import { createRequireAdmin } from '../middleware/require-admin.js';
import { AdminDashboardRepository } from '../repositories/admin-dashboard.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { AdminDashboardService } from '../services/admin-dashboard.service.js';

export async function adminDashboardRoutes(app: FastifyInstance) {
  const requireAdmin = createRequireAdmin(new UserRepository(app.prisma));
  const controller = new AdminDashboardController(
    new AdminDashboardService(new AdminDashboardRepository(app.prisma)),
  );

  app.get(
    '/admin/dashboard',
    { preHandler: [app.authenticate, requireAdmin] },
    controller.getDashboard,
  );
}
