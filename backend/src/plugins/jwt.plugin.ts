import fjwt from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { env } from '../config/env.js';
import { ApiKeyRepository } from '../repositories/api-key.repository.js';
import { ApiKeyService } from '../services/api-key.service.js';
import type { JwtPayload } from '../types/auth.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticateApiKey: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

function extractBearerOrApiKey(request: FastifyRequest): string | null {
  const apiKeyHeader = request.headers['x-api-key'];
  if (typeof apiKeyHeader === 'string' && apiKeyHeader.trim()) {
    return apiKeyHeader.trim();
  }

  const authorization = request.headers.authorization;
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim();
  }

  return null;
}

export const jwtPlugin = fp(async (app: FastifyInstance) => {
  await app.register(fjwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
    },
  });

  const apiKeyService = new ApiKeyService(new ApiKeyRepository(app.prisma));

  app.decorate(
    'authenticate',
    async (request: FastifyRequest, _reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        throw new AppError(401, MENSAGENS.NAO_AUTORIZADO);
      }
    },
  );

  app.decorate(
    'authenticateApiKey',
    async (request: FastifyRequest, _reply: FastifyReply) => {
      const rawKey = extractBearerOrApiKey(request);

      if (!rawKey) {
        throw new AppError(401, MENSAGENS.NAO_AUTORIZADO);
      }

      const userId = await apiKeyService.resolveUserIdFromRawKey(rawKey);

      if (!userId) {
        throw new AppError(401, MENSAGENS.CHAVE_API_INVALIDA);
      }

      request.user = { sub: userId };
    },
  );
});
