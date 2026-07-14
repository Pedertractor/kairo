import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  createThreeDPartSchema,
  threeDPartIdParamSchema,
  updateThreeDPartSchema,
} from '../schemas/three-d-part.schema.js';
import { ThreeDPartService } from '../services/three-d-part.service.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { MENSAGENS, sendSuccess } from '../utils/response.js';

export class ThreeDPartController {
  constructor(private readonly service: ThreeDPartService) {}

  list = async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const threeDParts = await this.service.list();
      return sendSuccess(reply, { threeDParts });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  getById = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = threeDPartIdParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const threeDPart = await this.service.getById(parsed.data.id);
      return sendSuccess(reply, { threeDPart });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = createThreeDPartSchema.safeParse(request.body);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const threeDPart = await this.service.create(
        parsed.data.name,
        parsed.data.code,
        parsed.data.timeToPrint,
      );

      return sendSuccess(
        reply,
        { threeDPart },
        201,
        MENSAGENS.PECA_3D_CRIADA_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = threeDPartIdParamSchema.safeParse(request.params);
      const body = updateThreeDPartSchema.safeParse(request.body);

      if (!params.success || !body.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const threeDPart = await this.service.update(params.data.id, body.data);

      return sendSuccess(
        reply,
        { threeDPart },
        200,
        MENSAGENS.PECA_3D_ATUALIZADA_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  delete = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = threeDPartIdParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      await this.service.delete(parsed.data.id);

      return sendSuccess(reply, null, 200, MENSAGENS.PECA_3D_REMOVIDA_SUCESSO);
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };
}
