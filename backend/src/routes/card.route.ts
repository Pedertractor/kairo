import type { FastifyInstance } from 'fastify';
import { CardController } from '../controllers/card.controller.js';
import { CardRepository } from '../repositories/card.repository.js';
import { FavoriteRepository } from '../repositories/favorite.repository.js';
import { TagRepository } from '../repositories/tag.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { CardService } from '../services/card.service.js';

export async function cardRoutes(app: FastifyInstance) {
  const controller = new CardController(
    new CardService(
      new CardRepository(app.prisma),
      new TeamRepository(app.prisma),
      new TimeEntryRepository(app.prisma),
      new FavoriteRepository(app.prisma),
      new TagRepository(app.prisma),
    ),
  );

  app.get(
    '/teams/:teamId/activities',
    { preHandler: [app.authenticate] },
    controller.listActivities,
  );
  app.get(
    '/teams/:teamId/activities/:activityId',
    { preHandler: [app.authenticate] },
    controller.getActivity,
  );
  app.post(
    '/teams/:teamId/activities',
    { preHandler: [app.authenticate] },
    controller.createActivity,
  );
  app.patch(
    '/teams/:teamId/activities/:activityId',
    { preHandler: [app.authenticate] },
    controller.updateActivity,
  );

  app.get(
    '/projects',
    { preHandler: [app.authenticate] },
    controller.listAllProjects,
  );
  app.get(
    '/projects/:projectId',
    { preHandler: [app.authenticate] },
    controller.getProjectById,
  );
  app.get(
    '/teams/:teamId/projects',
    { preHandler: [app.authenticate] },
    controller.listProjects,
  );
  app.get(
    '/teams/:teamId/projects/:projectId',
    { preHandler: [app.authenticate] },
    controller.getProject,
  );
  app.post(
    '/teams/:teamId/projects',
    { preHandler: [app.authenticate] },
    controller.createProject,
  );
  app.patch(
    '/teams/:teamId/projects/:projectId',
    { preHandler: [app.authenticate] },
    controller.updateProject,
  );
}
