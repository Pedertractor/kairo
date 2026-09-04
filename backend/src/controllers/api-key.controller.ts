import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  apiKeyIdParamSchema,
  createApiKeySchema,
} from '../schemas/api-key.schema.js';
import { ApiKeyService } from '../services/api-key.service.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { MENSAGENS, sendSuccess } from '../utils/response.js';

export class ApiKeyController {
  constructor(private readonly service: ApiKeyService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const apiKeys = await this.service.list(request.user.sub);
      return sendSuccess(reply, { apiKeys });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = createApiKeySchema.safeParse(request.body);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const apiKey = await this.service.create(
        request.user.sub,
        parsed.data.name,
      );

      return sendSuccess(
        reply,
        { apiKey },
        201,
        MENSAGENS.CHAVE_API_CRIADA_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  revoke = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = apiKeyIdParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const apiKey = await this.service.revoke(
        request.user.sub,
        parsed.data.id,
      );

      return sendSuccess(
        reply,
        { apiKey },
        200,
        MENSAGENS.CHAVE_API_REVOGADA_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };
}
