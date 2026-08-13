import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import Fastify from 'fastify';
import { env } from './config/env.js';
import { MAX_DOCUMENT_BYTES } from './lib/document-upload.js';
import { jwtPlugin } from './plugins/jwt.plugin.js';
import { prismaPlugin } from './plugins/prisma.plugin.js';
import { registerRoutes } from './routes/index.js';
import { AppError } from './utils/errors.js';
import { MENSAGENS, sendError } from './utils/response.js';

export async function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV === 'development',
    bodyLimit: MAX_DOCUMENT_BYTES,
  });

  await app.register(cors, {
    origin: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.register(multipart, {
    limits: {
      fileSize: MAX_DOCUMENT_BYTES,
      files: 1,
    },
  });

  app.setErrorHandler((error, _request, reply) => {
    if (reply.sent) return;

    if (error instanceof AppError) {
      return sendError(reply, error.statusCode, error.message);
    }

    app.log.error(error);
    return sendError(reply, 500, MENSAGENS.ERRO_INTERNO);
  });

  app.setNotFoundHandler((_request, reply) => {
    return sendError(reply, 404, MENSAGENS.ROTA_NAO_ENCONTRADA);
  });

  await app.register(prismaPlugin);
  await app.register(jwtPlugin);
  await registerRoutes(app);

  return app;
}
