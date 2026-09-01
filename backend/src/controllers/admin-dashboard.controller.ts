import type { FastifyReply, FastifyRequest } from 'fastify';
import { adminDashboardQuerySchema } from '../schemas/admin-dashboard.schema.js';
import { AdminDashboardService } from '../services/admin-dashboard.service.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { MENSAGENS, sendSuccess } from '../utils/response.js';

export class AdminDashboardController {
  constructor(private readonly service: AdminDashboardService) {}

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
}
