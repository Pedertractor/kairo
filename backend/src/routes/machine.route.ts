import type { FastifyInstance } from 'fastify';
import { MachineController } from '../controllers/machine.controller.js';
import { MachineRepository } from '../repositories/machine.repository.js';
import { MachineService } from '../services/machine.service.js';

export async function machineRoutes(app: FastifyInstance) {
  const controller = new MachineController(
    new MachineService(new MachineRepository(app.prisma)),
  );

  app.get('/machines', { preHandler: [app.authenticate] }, controller.list);
}
