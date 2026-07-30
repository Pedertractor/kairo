import type { FastifyInstance } from 'fastify';
import { TagController } from '../controllers/tag.controller.js';
import { TagRepository } from '../repositories/tag.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { TagService } from '../services/tag.service.js';

export async function tagRoutes(app: FastifyInstance) {
  const controller = new TagController(
    new TagService(
      new TagRepository(app.prisma),
      new TeamRepository(app.prisma),
    ),
  );

  app.get(
    '/teams/:teamId/tags',
    { preHandler: [app.authenticate] },
    controller.list,
  );
  app.post(
    '/teams/:teamId/tags',
    { preHandler: [app.authenticate] },
    controller.create,
  );
}
