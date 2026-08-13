import type { FastifyReply, FastifyRequest } from 'fastify';
import { listMachinesQuerySchema } from '../schemas/machine.schema.js';
import { MachineService } from '../services/machine.service.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { MENSAGENS, sendSuccess } from '../utils/response.js';

export class MachineController {
  constructor(private readonly service: MachineService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = listMachinesQuerySchema.safeParse(request.query);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const machines = await this.service.list({
        search: parsed.data.q,
        teamId: parsed.data.teamId,
      });

      return sendSuccess(reply, { machines });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };
}
