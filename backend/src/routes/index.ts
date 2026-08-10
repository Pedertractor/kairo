import type { FastifyInstance } from 'fastify';
import { analyticsRoutes } from './analytics.route.js';
import { authRoutes } from './auth.route.js';
import { cardRoutes } from './card.route.js';
import { favoriteRoutes } from './favorite.route.js';
import { taskRoutes } from './task.route.js';
import { healthRoutes } from './health.route.js';
import { tagRoutes } from './tag.route.js';
import { teamRoutes } from './team.route.js';
import { timeEntryRoutes } from './time-entry.route.js';
import { userRoutes } from './user.route.js';

export async function registerRoutes(app: FastifyInstance) {
  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(analyticsRoutes, { prefix: '/api' });
  await app.register(teamRoutes, { prefix: '/api' });
  await app.register(cardRoutes, { prefix: '/api' });
  await app.register(tagRoutes, { prefix: '/api' });
  await app.register(taskRoutes, { prefix: '/api' });
  await app.register(favoriteRoutes, { prefix: '/api' });
  await app.register(timeEntryRoutes, { prefix: '/api' });
  await app.register(userRoutes, { prefix: '/api' });
}
