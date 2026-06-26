import type { FastifyReply, FastifyRequest } from 'fastify';
import { HealthService } from '../services/health.service.js';
import { handleControllerError } from '../utils/errors.js';

export class HealthController {
  constructor(private readonly service: HealthService) {}

  getStatus = async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const status = await this.service.getStatus();
      const statusCode = status.status === 'ok' ? 200 : 503;
      return reply.status(statusCode).send(status);
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };
}
