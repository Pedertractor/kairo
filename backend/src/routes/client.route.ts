import type { FastifyInstance } from 'fastify';
import { ClientController } from '../controllers/client.controller.js';
import { ClientRepository } from '../repositories/client.repository.js';
import { ClientService } from '../services/client.service.js';

export async function clientRoutes(app: FastifyInstance) {
  const controller = new ClientController(
    new ClientService(new ClientRepository(app.prisma)),
  );

  app.get('/clients', { preHandler: [app.authenticate] }, controller.list);
}
