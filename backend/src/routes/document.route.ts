import type { FastifyInstance } from 'fastify';
import { DocumentController } from '../controllers/document.controller.js';
import { DocumentRepository } from '../repositories/document.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { DocumentService } from '../services/document.service.js';

export async function documentRoutes(app: FastifyInstance) {
  const controller = new DocumentController(
    new DocumentService(
      new DocumentRepository(app.prisma),
      new TeamRepository(app.prisma),
    ),
  );

  app.get(
    '/teams/:teamId/documents',
    { preHandler: [app.authenticate] },
    controller.list,
  );
  app.post(
    '/teams/:teamId/documents',
    { preHandler: [app.authenticate] },
    controller.upload,
  );
  app.get(
    '/teams/:teamId/documents/:documentId/file',
    { preHandler: [app.authenticate] },
    controller.download,
  );
  app.delete(
    '/teams/:teamId/documents/:documentId',
    { preHandler: [app.authenticate] },
    controller.delete,
  );
}
