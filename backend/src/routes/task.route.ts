import type { FastifyInstance } from 'fastify';
import { TaskController } from '../controllers/task.controller.js';
import { CardRepository } from '../repositories/card.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { TaskService } from '../services/task.service.js';

export async function taskRoutes(app: FastifyInstance) {
  const controller = new TaskController(
    new TaskService(
      new TaskRepository(app.prisma),
      new CardRepository(app.prisma),
      new TeamRepository(app.prisma),
    ),
  );

  app.get(
    '/projects/:projectId/tasks',
    { preHandler: [app.authenticate] },
    controller.listTasks,
  );
  app.post(
    '/projects/:projectId/tasks',
    { preHandler: [app.authenticate] },
    controller.createTask,
  );
}
