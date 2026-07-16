import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  changePasswordSchema,
  loginSchema,
  refreshTokenSchema,
} from '../schemas/auth.schema.js';
import { AuthService } from '../services/auth.service.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { MENSAGENS, sendSuccess } from '../utils/response.js';

export class AuthController {
  constructor(private readonly service: AuthService) {}

  private async issueTokenPair(reply: FastifyReply, userId: string) {
    const [token, refreshToken] = await Promise.all([
      reply.jwtSign({ sub: userId }),
      this.service.issueRefreshToken(userId),
    ]);

    return { token, refreshToken };
  }

  login = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = loginSchema.safeParse(request.body);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const user = await this.service.login(parsed.data);

      if (user.firstLogin) {
        return sendSuccess(
          reply,
          { user, requiresPasswordChange: true },
          200,
          MENSAGENS.PRIMEIRO_LOGIN,
        );
      }

      const tokens = await this.issueTokenPair(reply, user.id);

      return sendSuccess(
        reply,
        { ...tokens, user },
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

  refresh = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = refreshTokenSchema.safeParse(request.body);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const { user, refreshToken } = await this.service.rotateRefreshToken(
        parsed.data.refreshToken,
      );
      const token = await reply.jwtSign({ sub: user.id });

      return sendSuccess(reply, { token, refreshToken, user });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  logout = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = refreshTokenSchema.partial().safeParse(request.body ?? {});
      const refreshToken = parsed.success ? parsed.data.refreshToken : undefined;

      await this.service.revokeRefreshToken(refreshToken, request.user.sub);

      return sendSuccess(reply, null, 200, MENSAGENS.LOGOUT_SUCESSO);
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  changePassword = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = changePasswordSchema.safeParse(request.body);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const { user, passwordChanged } = await this.service.changePassword(parsed.data);

      if (passwordChanged) {
        await this.service.revokeAllUserTokens(user.id);
      }

      const tokens = await this.issueTokenPair(reply, user.id);

      return sendSuccess(
        reply,
        { ...tokens, user },
        200,
        passwordChanged ? MENSAGENS.SENHA_ALTERADA_SUCESSO : MENSAGENS.LOGIN_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };
}
