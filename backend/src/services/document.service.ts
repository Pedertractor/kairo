import { randomUUID } from 'node:crypto';
import { TeamRole } from '../generated/client.js';
import {
  deleteStoredFile,
  writeStoredFile,
} from '../lib/local-file-storage.js';
import {
  extensionForMimeType,
  isAllowedDocumentMimeType,
  MAX_DOCUMENT_BYTES,
  resolveDocumentMimeType,
} from '../lib/document-upload.js';
import { DocumentRepository } from '../repositories/document.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import type {
  DocumentFile,
  DocumentSummary,
} from '../types/document.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';
import { assertTeamMembership } from '../utils/team-access.js';

type DocumentRecord = Awaited<
  ReturnType<DocumentRepository['findByIdAndTeamId']>
>;

function toDocumentSummary(
  document: NonNullable<DocumentRecord>,
): DocumentSummary {
  return {
    id: document.id,
    originalName: document.originalName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    uploadedBy: {
      id: document.uploadedBy.id,
      name: document.uploadedBy.name,
    },
    createdAt: document.createdAt.toISOString(),
  };
}

export class DocumentService {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly teamRepository: TeamRepository,
  ) {}

  private async assertTeamMember(teamId: string, userId: string) {
    const membership = await this.teamRepository.findMembershipByTeamAndUser(
      teamId,
      userId,
    );

    return assertTeamMembership(membership);
  }

  async list(teamId: string, userId: string): Promise<DocumentSummary[]> {
    await this.assertTeamMember(teamId, userId);

    const documents = await this.documentRepository.findByTeamId(teamId);
    return documents.map(toDocumentSummary);
  }

  async upload(
    teamId: string,
    userId: string,
    file: {
      filename: string;
      mimetype: string;
      buffer: Buffer;
    },
  ): Promise<DocumentSummary> {
    await this.assertTeamMember(teamId, userId);

    const mimeType = resolveDocumentMimeType(file.mimetype, file.filename);

    if (!isAllowedDocumentMimeType(mimeType)) {
      throw new AppError(400, MENSAGENS.DOCUMENTO_TIPO_INVALIDO);
    }

    if (file.buffer.byteLength === 0) {
      throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
    }

    if (file.buffer.byteLength > MAX_DOCUMENT_BYTES) {
      throw new AppError(400, MENSAGENS.DOCUMENTO_TAMANHO_INVALIDO);
    }

    const originalName = file.filename.trim() || 'documento';
    const pendingKey = `pending/${randomUUID()}`;

    const created = await this.documentRepository.create({
      teamId,
      uploadedById: userId,
      originalName,
      mimeType,
      sizeBytes: file.buffer.byteLength,
      storageKey: pendingKey,
    });

    const storageKey = `teams/${teamId}/${created.id}${extensionForMimeType(mimeType)}`;

    try {
      await writeStoredFile(storageKey, file.buffer);
      const document = await this.documentRepository.updateStorageKey(
        created.id,
        storageKey,
      );
      return toDocumentSummary(document);
    } catch (error) {
      await this.documentRepository.deleteById(created.id);
      await deleteStoredFile(storageKey);
      throw error;
    }
  }

  async getFile(
    teamId: string,
    documentId: string,
    userId: string,
  ): Promise<DocumentFile> {
    await this.assertTeamMember(teamId, userId);

    const document = await this.documentRepository.findByIdAndTeamId(
      documentId,
      teamId,
    );

    if (!document) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    return {
      originalName: document.originalName,
      mimeType: document.mimeType,
      storageKey: document.storageKey,
    };
  }

  async delete(
    teamId: string,
    documentId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.assertTeamMember(teamId, userId);

    if (membership.role !== TeamRole.ADMIN) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

    const document = await this.documentRepository.findByIdAndTeamId(
      documentId,
      teamId,
    );

    if (!document) {
      throw new AppError(404, MENSAGENS.NAO_ENCONTRADO);
    }

    await this.documentRepository.deleteById(document.id);
    await deleteStoredFile(document.storageKey);
  }
}
