import type { FastifyInstance } from 'fastify';
import { HealthController } from '../controllers/health.controller.js';
import { HealthService } from '../services/health.service.js';

export async function healthRoutes(app: FastifyInstance) {
  const controller = new HealthController(new HealthService(app.prisma));

  app.get('/health', controller.getStatus);
}
