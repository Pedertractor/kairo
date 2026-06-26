import type { FastifyReply, FastifyRequest } from 'fastify';
import { MENSAGENS, sendError } from './response.js';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleControllerError(
  error: unknown,
  reply: FastifyReply,
): FastifyReply {
  if (error instanceof AppError) {
    return sendError(reply, error.statusCode, error.message);
  }

  console.error(error);
  return sendError(reply, 500, MENSAGENS.ERRO_INTERNO);
}

export type ControllerHandler = (
  request: FastifyRequest,
  reply: FastifyReply,
) => Promise<FastifyReply | void>;
