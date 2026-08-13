import type { FastifyReply, FastifyRequest } from 'fastify';
import { listClientsQuerySchema } from '../schemas/client.schema.js';
import { ClientService } from '../services/client.service.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { MENSAGENS, sendSuccess } from '../utils/response.js';

export class ClientController {
  constructor(private readonly service: ClientService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = listClientsQuerySchema.safeParse(request.query);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const clients = await this.service.list(parsed.data.q);

      return sendSuccess(reply, { clients });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };
}
