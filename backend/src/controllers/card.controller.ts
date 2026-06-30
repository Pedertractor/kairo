import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  activityParamSchema,
  createActivitySchema,
  teamIdParamSchema,
  updateActivityStatusSchema,
} from '../schemas/card.schema.js';
import { CardService } from '../services/card.service.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { MENSAGENS, sendSuccess } from '../utils/response.js';

export class CardController {
  constructor(private readonly service: CardService) {}

  listActivities = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = teamIdParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const activities = await this.service.listActivities(
        parsed.data.teamId,
        request.user.sub,
      );

      return sendSuccess(reply, { activities });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  getActivity = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = activityParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const activity = await this.service.getActivity(
        parsed.data.teamId,
        parsed.data.activityId,
        request.user.sub,
      );

      return sendSuccess(reply, { activity });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  createActivity = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = teamIdParamSchema.safeParse(request.params);
      const body = createActivitySchema.safeParse(request.body);

      if (!params.success || !body.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const activity = await this.service.createActivity(
        params.data.teamId,
        request.user.sub,
        body.data.title,
        body.data.description,
        body.data.estimatedHours,
      );

      return sendSuccess(
        reply,
        { activity },
        201,
        MENSAGENS.ATIVIDADE_CRIADA_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  updateActivityStatus = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    try {
      const params = activityParamSchema.safeParse(request.params);
      const body = updateActivityStatusSchema.safeParse(request.body);

      if (!params.success || !body.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const activity = await this.service.updateActivityStatus(
        params.data.teamId,
        params.data.activityId,
        request.user.sub,
        body.data.status,
      );

      return sendSuccess(
        reply,
        { activity },
        200,
        MENSAGENS.ATIVIDADE_ATUALIZADA_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };
}
