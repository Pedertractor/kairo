import type { FastifyReply, FastifyRequest } from 'fastify';
import { CostCenterService } from '../services/cost-center.service.js';
import { handleControllerError } from '../utils/errors.js';
import { MENSAGENS, sendSuccess } from '../utils/response.js';

export class CostCenterController {
  constructor(private readonly service: CostCenterService) {}

  list = async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const costCenters = await this.service.list();
      return sendSuccess(reply, { costCenters });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  sync = async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await this.service.syncFromExternal();
      return sendSuccess(
        reply,
        result,
        200,
        MENSAGENS.CENTROS_CUSTO_SINCRONIZADOS_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };
}
