import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  updateUserRoleSchema,
  userIdParamSchema,
} from '../schemas/user.schema.js';
import { UserService } from '../services/user.service.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { MENSAGENS, sendSuccess } from '../utils/response.js';

export class UserController {
  constructor(private readonly service: UserService) {}

  list = async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const users = await this.service.listUsers();
      return sendSuccess(reply, { users });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  updateRole = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = userIdParamSchema.safeParse(request.params);
      const body = updateUserRoleSchema.safeParse(request.body);

      if (!params.success || !body.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const user = await this.service.updateRole(
        request.user.sub,
        params.data.id,
        body.data.role,
      );

      return sendSuccess(
        reply,
        { user },
        200,
        MENSAGENS.USUARIO_ROLE_ATUALIZADO_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  resetPassword = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = userIdParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const user = await this.service.resetPassword(parsed.data.id);

      return sendSuccess(
        reply,
        { user },
        200,
        MENSAGENS.USUARIO_SENHA_REPOSTA_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  deactivate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = userIdParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const user = await this.service.deactivate(
        request.user.sub,
        parsed.data.id,
      );

      return sendSuccess(
        reply,
        { user },
        200,
        MENSAGENS.USUARIO_DESATIVADO_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  reactivate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = userIdParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const user = await this.service.reactivate(parsed.data.id);

      return sendSuccess(
        reply,
        { user },
        200,
        MENSAGENS.USUARIO_REATIVADO_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };
}
