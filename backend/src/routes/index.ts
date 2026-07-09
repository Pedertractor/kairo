import type { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.route.js';
import { cardRoutes } from './card.route.js';
import { taskRoutes } from './task.route.js';
import { healthRoutes } from './health.route.js';
import { printingMachineRoutes } from './printing-machine.route.js';
import { teamRoutes } from './team.route.js';
import { threeDPartRoutes } from './three-d-part.route.js';
import { timeEntryRoutes } from './time-entry.route.js';
import { userRoutes } from './user.route.js';

export async function registerRoutes(app: FastifyInstance) {
  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(teamRoutes, { prefix: '/api' });
  await app.register(cardRoutes, { prefix: '/api' });
  await app.register(taskRoutes, { prefix: '/api' });
  await app.register(timeEntryRoutes, { prefix: '/api' });
  await app.register(userRoutes, { prefix: '/api' });
  await app.register(printingMachineRoutes, { prefix: '/api' });
  await app.register(threeDPartRoutes, { prefix: '/api' });
}
