import type { FastifyReply, FastifyRequest } from 'fastify';
import { createTagSchema, teamIdParamSchema } from '../schemas/tag.schema.js';
import { TagService } from '../services/tag.service.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { MENSAGENS, sendSuccess } from '../utils/response.js';

export class TagController {
  constructor(private readonly service: TagService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = teamIdParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const tags = await this.service.list(
        parsed.data.teamId,
        request.user.sub,
      );

      return sendSuccess(reply, { tags });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = teamIdParamSchema.safeParse(request.params);
      const body = createTagSchema.safeParse(request.body);

      if (!params.success || !body.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const tag = await this.service.create(
        params.data.teamId,
        request.user.sub,
        body.data.name,
        body.data.color,
      );

      return sendSuccess(reply, { tag }, 201, MENSAGENS.TAG_CRIADA_SUCESSO);
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };
}
