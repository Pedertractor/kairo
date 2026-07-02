import type { FastifyReply, FastifyRequest } from 'fastify';
import { activityParamSchema } from '../schemas/card.schema.js';
import { taskParamSchema } from '../schemas/task.schema.js';
import {
  dayDashboardQuerySchema,
  listTaskTimeEntriesQuerySchema,
  taskTimeEntryParamSchema,
  updateTaskTimeEntrySchema,
} from '../schemas/time-entry.schema.js';
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

  startActivityTimer = async (request: FastifyRequest, reply: FastifyReply) => {
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

  startTaskTimer = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = taskParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const activeTimer = await this.service.startTaskTimer(
        parsed.data.projectId,
        parsed.data.taskId,
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

  listTaskTimeEntries = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = taskParamSchema.safeParse(request.params);
      const query = listTaskTimeEntriesQuerySchema.safeParse(request.query);

      if (!params.success || !query.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const result = await this.service.listTaskTimeEntries(
        params.data.projectId,
        params.data.taskId,
        request.user.sub,
        query.data,
      );

      return sendSuccess(reply, result);
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  updateTaskTimeEntry = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = taskTimeEntryParamSchema.safeParse(request.params);
      const body = updateTaskTimeEntrySchema.safeParse(request.body);

      if (!params.success || !body.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const timeEntry = await this.service.updateTaskTimeEntry(
        params.data.projectId,
        params.data.taskId,
        params.data.timeEntryId,
        request.user.sub,
        body.data.startedAt,
        body.data.endedAt,
      );

      return sendSuccess(
        reply,
        { timeEntry },
        200,
        MENSAGENS.APONTAMENTO_ATUALIZADO_SUCESSO,
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

  getDayDashboard = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = dayDashboardQuerySchema.safeParse(request.query);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const dashboard = await this.service.getDayDashboard(
        request.user.sub,
        parsed.data.date,
      );

      return sendSuccess(reply, dashboard);
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };
}
