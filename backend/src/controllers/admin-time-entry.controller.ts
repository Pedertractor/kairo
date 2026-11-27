import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ZodType } from 'zod';
import {
  adminTimeEntryIdParamSchema,
  adminTimeEntryListQuerySchema,
  adminWorkItemsQuerySchema,
  createAdminTimeEntrySchema,
  updateAdminTimeEntrySchema,
} from '../schemas/admin-time-entry.schema.js';
import { AdminTimeEntryService } from '../services/admin-time-entry.service.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { MENSAGENS, sendSuccess } from '../utils/response.js';

function parse<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    // Only our own refine messages are user-facing Portuguese text.
    const issue = result.error.issues.find((item) => item.code === 'custom');
    throw new AppError(400, issue?.message ?? MENSAGENS.REQUISICAO_INVALIDA);
  }

  return result.data;
}

export class AdminTimeEntryController {
  constructor(private readonly service: AdminTimeEntryService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = parse(adminTimeEntryListQuerySchema, request.query);
      return sendSuccess(reply, await this.service.list(request.user.sub, query));
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  listUsers = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return sendSuccess(reply, await this.service.listUsers(request.user.sub));
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  searchWorkItems = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = parse(adminWorkItemsQuerySchema, request.query);
      return sendSuccess(
        reply,
        await this.service.searchWorkItems(request.user.sub, query),
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  getAudit = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { timeEntryId } = parse(adminTimeEntryIdParamSchema, request.params);
      return sendSuccess(
        reply,
        await this.service.getAudit(request.user.sub, timeEntryId),
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = parse(createAdminTimeEntrySchema, request.body);
      return sendSuccess(
        reply,
        await this.service.create(request.user.sub, body),
        201,
        MENSAGENS.APONTAMENTO_CRIADO_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { timeEntryId } = parse(adminTimeEntryIdParamSchema, request.params);
      const body = parse(updateAdminTimeEntrySchema, request.body);
      return sendSuccess(
        reply,
        await this.service.update(request.user.sub, timeEntryId, body),
        200,
        MENSAGENS.APONTAMENTO_ATUALIZADO_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  remove = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { timeEntryId } = parse(adminTimeEntryIdParamSchema, request.params);
      return sendSuccess(
        reply,
        await this.service.remove(request.user.sub, timeEntryId),
        200,
        MENSAGENS.APONTAMENTO_EXCLUIDO_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };
}
