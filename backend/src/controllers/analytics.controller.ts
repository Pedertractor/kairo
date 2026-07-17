import type { FastifyReply, FastifyRequest } from 'fastify';
import { analyticsQuerySchema } from '../schemas/analytics.schema.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { MENSAGENS, sendSuccess } from '../utils/response.js';

export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  getDashboard = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = analyticsQuerySchema.safeParse(request.query);

      if (!query.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const dashboard = await this.service.getDashboard(
        request.user.sub,
        query.data,
      );

      return sendSuccess(reply, dashboard);
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };
}
