import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  adminAbsenceListQuerySchema,
  createAbsenceSchema,
  absenceIdParamSchema,
  updateAbsenceSchema,
} from '../schemas/absence.schema.js';
import { AbsenceService } from '../services/absence.service.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { MENSAGENS, sendSuccess } from '../utils/response.js';

export class AbsenceController {
  constructor(private readonly service: AbsenceService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await this.service.listForActor(request.user.sub);
      return sendSuccess(reply, result);
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  listAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = adminAbsenceListQuerySchema.safeParse(request.query);

      if (!query.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const result = await this.service.listForAdmin(
        request.user.sub,
        query.data,
      );
      return sendSuccess(reply, result);
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  unseenCount = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await this.service.countUnseenForActor(request.user.sub);
      return sendSuccess(reply, result);
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  markSeen = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await this.service.markSeenForActor(request.user.sub);
      return sendSuccess(reply, result);
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = createAbsenceSchema.safeParse(request.body);

      if (!body.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      await this.service.createForActor(
        request.user.sub,
        body.data.userId,
        body.data.startDate,
        body.data.endDate,
      );

      return sendSuccess(
        reply,
        await this.service.listForActor(request.user.sub),
        201,
        MENSAGENS.AUSENCIA_CRIADA_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  cancel = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = absenceIdParamSchema.safeParse(request.params);

      if (!params.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      await this.service.cancelFuture(request.user.sub, params.data.id);

      return sendSuccess(
        reply,
        await this.service.listForActor(request.user.sub),
        200,
        MENSAGENS.AUSENCIA_CANCELADA_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  updateAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = absenceIdParamSchema.safeParse(request.params);
      const body = updateAbsenceSchema.safeParse(request.body);

      if (!params.success || !body.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      await this.service.updateForAdmin(
        request.user.sub,
        params.data.id,
        body.data.userId,
        body.data.startDate,
        body.data.endDate,
      );

      return sendSuccess(
        reply,
        await this.service.listForAdmin(request.user.sub),
        200,
        MENSAGENS.AUSENCIA_EDITADA_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  deleteAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = absenceIdParamSchema.safeParse(request.params);

      if (!params.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      await this.service.deleteForAdmin(request.user.sub, params.data.id);

      return sendSuccess(
        reply,
        await this.service.listForAdmin(request.user.sub),
        200,
        MENSAGENS.AUSENCIA_EXCLUIDA_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };
}
