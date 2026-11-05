import type { FastifyReply, FastifyRequest } from 'fastify';
import { infractionsQuerySchema } from '../schemas/infraction.schema.js';
import { InfractionService } from '../services/infraction.service.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { sendSuccess } from '../utils/response.js';

export class InfractionController {
  constructor(private readonly service: InfractionService) {}

  getReport = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = infractionsQuerySchema.safeParse(request.query);
      if (!query.success) {
        throw new AppError(400, 'Informe um mês de 1 a 12 e um ano inteiro positivo');
      }
      return sendSuccess(reply, await this.service.getReport(query.data));
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };
}
