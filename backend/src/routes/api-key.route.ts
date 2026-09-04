import type { FastifyInstance } from 'fastify';
import { ApiKeyController } from '../controllers/api-key.controller.js';
import { ApiKeyRepository } from '../repositories/api-key.repository.js';
import { ApiKeyService } from '../services/api-key.service.js';

export async function apiKeyRoutes(app: FastifyInstance) {
  const controller = new ApiKeyController(
    new ApiKeyService(new ApiKeyRepository(app.prisma)),
  );

  app.get('/api-keys', { preHandler: [app.authenticate] }, controller.list);
  app.post('/api-keys', { preHandler: [app.authenticate] }, controller.create);
  app.delete(
    '/api-keys/:id',
    { preHandler: [app.authenticate] },
    controller.revoke,
  );
}
