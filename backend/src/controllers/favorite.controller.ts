import type { FastifyReply, FastifyRequest } from 'fastify';
import { activityParamSchema } from '../schemas/card.schema.js';
import { taskParamSchema } from '../schemas/task.schema.js';
import { FavoriteService } from '../services/favorite.service.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { MENSAGENS, sendSuccess } from '../utils/response.js';

export class FavoriteController {
  constructor(private readonly service: FavoriteService) {}

  listFavorites = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const favorites = await this.service.listFavorites(request.user.sub);
      return sendSuccess(reply, { favorites });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  toggleActivityFavorite = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    try {
      const parsed = activityParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const result = await this.service.toggleActivityFavorite(
        parsed.data.teamId,
        parsed.data.activityId,
        request.user.sub,
      );

      return sendSuccess(reply, result);
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  toggleTaskFavorite = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    try {
      const parsed = taskParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const result = await this.service.toggleTaskFavorite(
        parsed.data.projectId,
        parsed.data.taskId,
        request.user.sub,
      );

      return sendSuccess(reply, result);
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };
}
