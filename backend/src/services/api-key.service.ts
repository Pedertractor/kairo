import { createHash, randomBytes } from 'node:crypto';
import type { ApiKey } from '../generated/client.js';
import { ApiKeyRepository } from '../repositories/api-key.repository.js';
import type { ApiKeySummary, CreatedApiKey } from '../types/api-key.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';

const API_KEY_PREFIX = 'kairo_';

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

function generateRawApiKey(): string {
  return `${API_KEY_PREFIX}${randomBytes(32).toString('hex')}`;
}

function toSummary(row: ApiKey): ApiKeySummary {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.keyPrefix,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export class ApiKeyService {
  constructor(private readonly apiKeyRepository: ApiKeyRepository) {}

  async list(userId: string): Promise<ApiKeySummary[]> {
    const rows = await this.apiKeyRepository.listByUserId(userId);
    return rows.map(toSummary);
  }

  async create(userId: string, name: string): Promise<CreatedApiKey> {
    const rawKey = generateRawApiKey();
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = rawKey.slice(0, 12);

    const row = await this.apiKeyRepository.create({
      userId,
      name: name.trim(),
      keyPrefix,
      keyHash,
    });

    return {
      ...toSummary(row),
      key: rawKey,
    };
  }

  async revoke(userId: string, id: string): Promise<ApiKeySummary> {
    const existing = await this.apiKeyRepository.findByIdForUser(id, userId);

    if (!existing || existing.revokedAt) {
      throw new AppError(404, MENSAGENS.CHAVE_API_NAO_ENCONTRADA);
    }

    const row = await this.apiKeyRepository.revoke(id);
    return toSummary(row);
  }

  async resolveUserIdFromRawKey(rawKey: string): Promise<string | null> {
    if (!rawKey.startsWith(API_KEY_PREFIX)) {
      return null;
    }

    const keyHash = hashApiKey(rawKey);
    const row = await this.apiKeyRepository.findActiveByHash(keyHash);

    if (!row) {
      return null;
    }

    void this.apiKeyRepository.touchLastUsed(row.id).catch(() => undefined);

    return row.userId;
  }
}
