import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { ApiKey } from '../generated/client.js';
import { ApiKeyScope, UserRole } from '../generated/client.js';
import { ApiKeyRepository } from '../repositories/api-key.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import type {
  ApiKeyScope as ApiKeyScopeType,
  ApiKeySummary,
  CreatedApiKey,
  ResolvedApiKey,
} from '../types/api-key.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';

const INTEGRATION_KEY_PREFIX = 'kairo_';
const OCCUPATION_KEY_PREFIX = 'kairo_occ_';

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

function generateRawApiKey(scope: ApiKeyScope): string {
  if (scope === ApiKeyScope.OCCUPATION) {
    return `${OCCUPATION_KEY_PREFIX}${randomBytes(48).toString('hex')}`;
  }

  return `${INTEGRATION_KEY_PREFIX}${randomBytes(32).toString('hex')}`;
}

function isKnownApiKeyFormat(rawKey: string): boolean {
  return (
    rawKey.startsWith(OCCUPATION_KEY_PREFIX) ||
    rawKey.startsWith(INTEGRATION_KEY_PREFIX)
  );
}

function toSummary(row: ApiKey): ApiKeySummary {
  return {
    id: row.id,
    name: row.name,
    scope: row.scope,
    keyPrefix: row.keyPrefix,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function hashesMatch(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export class ApiKeyService {
  constructor(
    private readonly apiKeyRepository: ApiKeyRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async list(userId: string): Promise<ApiKeySummary[]> {
    const actor = await this.userRepository.findById(userId);

    if (!actor || !actor.active) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

    const ownKeys = await this.apiKeyRepository.listByUserId(userId);

    if (actor.role !== UserRole.ADMIN) {
      return ownKeys
        .filter((row) => row.scope === ApiKeyScope.INTEGRATION)
        .map(toSummary);
    }

    const occupationKeys =
      await this.apiKeyRepository.listActiveByScope(ApiKeyScope.OCCUPATION);
    const byId = new Map<string, ApiKey>();

    for (const row of ownKeys) {
      byId.set(row.id, row);
    }

    for (const row of occupationKeys) {
      byId.set(row.id, row);
    }

    return [...byId.values()]
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map(toSummary);
  }

  async create(
    userId: string,
    name: string,
    scope: ApiKeyScopeType = 'INTEGRATION',
  ): Promise<CreatedApiKey> {
    const actor = await this.userRepository.findById(userId);

    if (!actor || !actor.active) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

    if (scope === 'OCCUPATION') {
      if (actor.role !== UserRole.ADMIN) {
        throw new AppError(403, MENSAGENS.CHAVE_API_OCUPACAO_PROIBIDA);
      }

      const existing = await this.apiKeyRepository.findActiveByScope(
        ApiKeyScope.OCCUPATION,
      );

      if (existing) {
        throw new AppError(409, MENSAGENS.CHAVE_API_OCUPACAO_JA_EXISTE);
      }
    }

    const prismaScope =
      scope === 'OCCUPATION' ? ApiKeyScope.OCCUPATION : ApiKeyScope.INTEGRATION;
    const rawKey = generateRawApiKey(prismaScope);
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = rawKey.slice(
      0,
      prismaScope === ApiKeyScope.OCCUPATION ? 18 : 12,
    );

    const row = await this.apiKeyRepository.create({
      userId,
      name: name.trim(),
      scope: prismaScope,
      keyPrefix,
      keyHash,
    });

    return {
      ...toSummary(row),
      key: rawKey,
    };
  }

  async revoke(userId: string, id: string): Promise<ApiKeySummary> {
    const actor = await this.userRepository.findById(userId);

    if (!actor || !actor.active) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

    const existing = await this.apiKeyRepository.findById(id);

    if (!existing || existing.revokedAt) {
      throw new AppError(404, MENSAGENS.CHAVE_API_NAO_ENCONTRADA);
    }

    const isOwner = existing.userId === userId;
    const isAdminRevokingOccupation =
      actor.role === UserRole.ADMIN &&
      existing.scope === ApiKeyScope.OCCUPATION;

    if (!isOwner && !isAdminRevokingOccupation) {
      throw new AppError(404, MENSAGENS.CHAVE_API_NAO_ENCONTRADA);
    }

    if (
      existing.scope === ApiKeyScope.OCCUPATION &&
      actor.role !== UserRole.ADMIN
    ) {
      throw new AppError(403, MENSAGENS.PROIBIDO);
    }

    const row = await this.apiKeyRepository.revoke(id);
    return toSummary(row);
  }

  async resolveFromRawKey(rawKey: string): Promise<ResolvedApiKey | null> {
    if (!isKnownApiKeyFormat(rawKey)) {
      return null;
    }

    const keyHash = hashApiKey(rawKey);
    const row = await this.apiKeyRepository.findActiveByHash(keyHash);

    if (!row || !hashesMatch(row.keyHash, keyHash)) {
      return null;
    }

    void this.apiKeyRepository.touchLastUsed(row.id).catch(() => undefined);

    return {
      userId: row.userId,
      scope: row.scope,
    };
  }
}
