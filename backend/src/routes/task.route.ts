import type { FastifyInstance } from 'fastify';
import { TaskController } from '../controllers/task.controller.js';
import { CardRepository } from '../repositories/card.repository.js';
import { FavoriteRepository } from '../repositories/favorite.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { TimeEntryRepository } from '../repositories/time-entry.repository.js';
import { TaskService } from '../services/task.service.js';

export async function taskRoutes(app: FastifyInstance) {
  const controller = new TaskController(
    new TaskService(
      new TaskRepository(app.prisma),
      new CardRepository(app.prisma),
      new TeamRepository(app.prisma),
      new TimeEntryRepository(app.prisma),
      new FavoriteRepository(app.prisma),
    ),
  );

  app.get(
    '/projects/:projectId/tasks',
    { preHandler: [app.authenticate] },
    controller.listTasks,
  );
  app.get(
    '/projects/:projectId/tasks/:taskId',
    { preHandler: [app.authenticate] },
    controller.getTask,
  );
  app.post(
    '/projects/:projectId/tasks',
    { preHandler: [app.authenticate] },
    controller.createTask,
  );
}
