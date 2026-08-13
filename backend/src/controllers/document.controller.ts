import type { FastifyReply, FastifyRequest } from 'fastify';
import '@fastify/multipart';
import { createStoredFileStream } from '../lib/local-file-storage.js';
import {
  documentIdParamSchema,
  teamIdParamSchema,
} from '../schemas/document.schema.js';
import { DocumentService } from '../services/document.service.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { MENSAGENS, sendSuccess } from '../utils/response.js';

function isFileTooLargeError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === 'FST_REQ_FILE_TOO_LARGE'
  );
}

function contentDispositionInline(originalName: string): string {
  const fallback = originalName
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/"/g, '\\"');
  const encoded = encodeURIComponent(originalName);

  return `inline; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export class DocumentController {
  constructor(private readonly service: DocumentService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = teamIdParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const documents = await this.service.list(
        parsed.data.teamId,
        request.user.sub,
      );

      return sendSuccess(reply, { documents });
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  upload = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = teamIdParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const file = await request.file();

      if (!file) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      let buffer: Buffer;
      try {
        buffer = await file.toBuffer();
      } catch (error) {
        if (isFileTooLargeError(error)) {
          throw new AppError(400, MENSAGENS.DOCUMENTO_TAMANHO_INVALIDO);
        }

        throw error;
      }

      if (file.file.truncated) {
        throw new AppError(400, MENSAGENS.DOCUMENTO_TAMANHO_INVALIDO);
      }

      const document = await this.service.upload(
        parsed.data.teamId,
        request.user.sub,
        {
          filename: file.filename,
          mimetype: file.mimetype,
          buffer,
        },
      );

      return sendSuccess(
        reply,
        { document },
        201,
        MENSAGENS.DOCUMENTO_ENVIADO_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  download = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = documentIdParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      const file = await this.service.getFile(
        parsed.data.teamId,
        parsed.data.documentId,
        request.user.sub,
      );

      return reply
        .header('Content-Type', file.mimeType)
        .header('Content-Disposition', contentDispositionInline(file.originalName))
        .send(createStoredFileStream(file.storageKey));
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };

  delete = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = documentIdParamSchema.safeParse(request.params);

      if (!parsed.success) {
        throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
      }

      await this.service.delete(
        parsed.data.teamId,
        parsed.data.documentId,
        request.user.sub,
      );

      return sendSuccess(
        reply,
        { ok: true },
        200,
        MENSAGENS.DOCUMENTO_REMOVIDO_SUCESSO,
      );
    } catch (error) {
      return handleControllerError(error, reply);
    }
  };
}
