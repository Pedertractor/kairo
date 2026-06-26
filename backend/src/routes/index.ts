import type { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.route.js';
import { healthRoutes } from './health.route.js';

export async function registerRoutes(app: FastifyInstance) {
  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(authRoutes, { prefix: '/api' });
}
