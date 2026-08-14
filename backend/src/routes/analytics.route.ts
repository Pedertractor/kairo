import type { FastifyInstance } from 'fastify';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { AbsenceRepository } from '../repositories/absence.repository.js';
import { AnalyticsRepository } from '../repositories/analytics.repository.js';
import { AnalyticsService } from '../services/analytics.service.js';

export async function analyticsRoutes(app: FastifyInstance) {
  const controller = new AnalyticsController(
    new AnalyticsService(
      new AnalyticsRepository(app.prisma),
      new AbsenceRepository(app.prisma),
    ),
  );

  app.get(
    '/analytics',
    { preHandler: [app.authenticate] },
    controller.getDashboard,
  );
}
