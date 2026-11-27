import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  adminDashboardQuerySchema,
  adminLeaderDayQuerySchema,
  adminLeaderParamSchema,
} from '../schemas/admin-dashboard.schema.js';
import { AdminDashboardService } from '../services/admin-dashboard.service.js';
import type { AdminLeaderTimelineService } from '../services/admin-leader-timeline.service.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { MENSAGENS, sendSuccess } from '../utils/response.js';

export class AdminDashboardController {
  constructor(
    private readonly service: AdminDashboardService,
    private readonly leaderTimelineService: AdminLeaderTimelineService,
  ) {}

  getDashboard = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = adminDashboardQuerySchema.safeParse(request.query);

      if (!query.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const dashboard = await this.service.getDashboard(query.data);

      return sendSuccess(reply, dashboard);
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  listLeaders = async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      return sendSuccess(reply, {
        leaders: await this.leaderTimelineService.listLeaders(),
      });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  getLeaderDay = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = adminLeaderParamSchema.safeParse(request.params);
      const query = adminLeaderDayQuerySchema.safeParse(request.query);

      if (!params.success || !query.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const dashboard = await this.leaderTimelineService.getLeaderDay(
        params.data.leaderId,
        query.data.date,
        query.data.userId,
      );

      return sendSuccess(reply, dashboard);
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };
}
