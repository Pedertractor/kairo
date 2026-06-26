import type { FastifyReply, FastifyRequest } from 'fastify';
import { loginSchema } from '../schemas/auth.schema.js';
import { AuthService } from '../services/auth.service.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { MENSAGENS, sendSuccess } from '../utils/response.js';

export class AuthController {
  constructor(private readonly service: AuthService) {}

  login = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = loginSchema.safeParse(request.body);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const user = await this.service.login(parsed.data);
      const token = await reply.jwtSign({ sub: user.id });

      return sendSuccess(
        reply,
        { token, user },
        200,
        MENSAGENS.LOGIN_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  me = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await this.service.getAuthenticatedUser(request.user.sub);
      return sendSuccess(reply, { user });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  logout = async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      return sendSuccess(reply, null, 200, MENSAGENS.LOGOUT_SUCESSO);
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };
}
