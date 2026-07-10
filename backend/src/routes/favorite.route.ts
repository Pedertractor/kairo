import type { FastifyInstance } from 'fastify';
import { FavoriteController } from '../controllers/favorite.controller.js';
import { CardRepository } from '../repositories/card.repository.js';
import { FavoriteRepository } from '../repositories/favorite.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { FavoriteService } from '../services/favorite.service.js';

export async function favoriteRoutes(app: FastifyInstance) {
  const controller = new FavoriteController(
    new FavoriteService(
      new FavoriteRepository(app.prisma),
      new CardRepository(app.prisma),
      new TaskRepository(app.prisma),
      new TeamRepository(app.prisma),
    ),
  );

  app.get(
    '/favorites',
    { preHandler: [app.authenticate] },
    controller.listFavorites,
  );
  app.post(
    '/teams/:teamId/activities/:activityId/favorite',
    { preHandler: [app.authenticate] },
    controller.toggleActivityFavorite,
  );
  app.post(
    '/projects/:projectId/tasks/:taskId/favorite',
    { preHandler: [app.authenticate] },
    controller.toggleTaskFavorite,
  );
}
