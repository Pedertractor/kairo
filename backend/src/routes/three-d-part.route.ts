import type { FastifyInstance } from 'fastify';
import { ThreeDPartController } from '../controllers/three-d-part.controller.js';
import { createRequirePrinterOperator } from '../middleware/require-printer-operator.js';
import { ThreeDPartRepository } from '../repositories/three-d-part.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { ThreeDPartService } from '../services/three-d-part.service.js';

export async function threeDPartRoutes(app: FastifyInstance) {
  const userRepository = new UserRepository(app.prisma);
  const requirePrinterOperator = createRequirePrinterOperator(userRepository);
  const controller = new ThreeDPartController(
    new ThreeDPartService(new ThreeDPartRepository(app.prisma)),
  );

  const preHandler = [app.authenticate, requirePrinterOperator];

  app.get('/three-d-parts', { preHandler }, controller.list);
  app.get('/three-d-parts/:id', { preHandler }, controller.getById);
  app.post('/three-d-parts', { preHandler }, controller.create);
  app.patch('/three-d-parts/:id', { preHandler }, controller.update);
  app.delete('/three-d-parts/:id', { preHandler }, controller.delete);
}
