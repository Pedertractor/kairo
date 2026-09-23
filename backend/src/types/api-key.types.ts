export type ApiKeyScope = 'INTEGRATION' | 'OCCUPATION';

export interface ApiKeySummary {
  id: string;
  name: string;
  scope: ApiKeyScope;
  keyPrefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface CreatedApiKey extends ApiKeySummary {
  /** Plaintext shown only once at creation time. */
  key: string;
}

export interface ResolvedApiKey {
  userId: string;
  scope: ApiKeyScope;
}
