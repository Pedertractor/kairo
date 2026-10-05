import type { FastifyInstance } from 'fastify';
import { CardController } from '../controllers/card.controller.js';
import { CardHistoryRepository } from '../repositories/card-history.repository.js';
import { CardRepository } from '../repositories/card.repository.js';
import { ClientRepository } from '../repositories/client.repository.js';
import { FavoriteRepository } from '../repositories/favorite.repository.js';
import { MachineRepository } from '../repositories/machine.repository.js';
import { TagRepository } from '../repositories/tag.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { CardService } from '../services/card.service.js';

export async function cardRoutes(app: FastifyInstance) {
  const controller = new CardController(
    new CardService(
      new CardRepository(app.prisma),
      new TeamRepository(app.prisma),
      new TimeEntryRepository(app.prisma),
      new FavoriteRepository(app.prisma),
      new TagRepository(app.prisma),
      new ClientRepository(app.prisma),
      new MachineRepository(app.prisma),
      new UserRepository(app.prisma),
      new CardHistoryRepository(app.prisma),
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
  app.get(
    '/teams/:teamId/activities/:activityId/history',
    { preHandler: [app.authenticate] },
    controller.listActivityHistory,
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
  app.delete(
    '/teams/:teamId/activities/:activityId',
    { preHandler: [app.authenticate] },
    controller.deleteActivity,
  );

  app.get(
    '/activities',
    { preHandler: [app.authenticate] },
    controller.listAllActivities,
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
  app.delete(
    '/teams/:teamId/projects/:projectId',
    { preHandler: [app.authenticate] },
    controller.deleteProject,
  );
}
