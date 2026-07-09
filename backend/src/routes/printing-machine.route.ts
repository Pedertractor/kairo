import type { FastifyInstance } from 'fastify';
import { PrintingMachineController } from '../controllers/printing-machine.controller.js';
import { createRequirePrinterOperator } from '../middleware/require-printer-operator.js';
import { PrintingMachineRepository } from '../repositories/printing-machine.repository.js';
import { ThreeDPartRepository } from '../repositories/three-d-part.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { PrintingMachineService } from '../services/printing-machine.service.js';

export async function printingMachineRoutes(app: FastifyInstance) {
  const userRepository = new UserRepository(app.prisma);
  const requirePrinterOperator = createRequirePrinterOperator(userRepository);
  const controller = new PrintingMachineController(
    new PrintingMachineService(
      new PrintingMachineRepository(app.prisma),
      new ThreeDPartRepository(app.prisma),
    ),
  );

  const preHandler = [app.authenticate, requirePrinterOperator];

  app.get('/printing-machines', { preHandler }, controller.list);
  app.get('/printing-machines/:id', { preHandler }, controller.getById);
  app.post('/printing-machines', { preHandler }, controller.create);
  app.patch('/printing-machines/:id', { preHandler }, controller.update);
  app.delete('/printing-machines/:id', { preHandler }, controller.delete);
}
