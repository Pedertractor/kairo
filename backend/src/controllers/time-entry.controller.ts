import type { FastifyReply, FastifyRequest } from 'fastify';
import { activityParamSchema } from '../schemas/card.schema.js';
import { TimeEntryService } from '../services/time-entry.service.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { MENSAGENS, sendSuccess } from '../utils/response.js';

export class TimeEntryController {
  constructor(private readonly service: TimeEntryService) {}

  getActive = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const activeTimer = await this.service.getActiveTimer(request.user.sub);

      return sendSuccess(reply, { activeTimer });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  startActivityTimer = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    try {
      const parsed = activityParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const activeTimer = await this.service.startActivityTimer(
        parsed.data.teamId,
        parsed.data.activityId,
        request.user.sub,
      );

      return sendSuccess(
        reply,
        { activeTimer },
        201,
        MENSAGENS.TIMER_INICIADO_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  pauseActive = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const timeEntry = await this.service.pauseActiveTimer(request.user.sub);

      return sendSuccess(
        reply,
        { timeEntry },
        200,
        MENSAGENS.TIMER_PAUSADO_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  getRecent = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const items = await this.service.getRecentWorkItems(request.user.sub);

      return sendSuccess(reply, { items });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };
}
