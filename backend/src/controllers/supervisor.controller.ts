import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  supervisorLeaderParamSchema,
  supervisorQuerySchema,
} from '../schemas/supervisor.schema.js';
import { SupervisorService } from '../services/supervisor.service.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { MENSAGENS, sendSuccess } from '../utils/response.js';

export class SupervisorController {
  constructor(private readonly service: SupervisorService) {}

  listSupervisors = async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      return sendSuccess(reply, {
        supervisors: await this.service.listSupervisors(),
      });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  listLeaders = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = supervisorQuerySchema.safeParse(request.query);

      if (!query.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const leaders = await this.service.listLeaders(
        request.user.sub,
        query.data.supervisorId,
      );
      return sendSuccess(reply, { leaders });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  listLeaderTeams = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = supervisorLeaderParamSchema.safeParse(request.params);
      const query = supervisorQuerySchema.safeParse(request.query);

      if (!params.success || !query.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const result = await this.service.listLeaderTeams(
        request.user.sub,
        params.data.leaderId,
        query.data.supervisorId,
      );
      return sendSuccess(reply, result);
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };
}
