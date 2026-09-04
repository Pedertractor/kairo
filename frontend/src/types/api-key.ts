export interface ApiKeySummary {
  id: string
  name: string
  keyPrefix: string
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
}

export interface CreatedApiKey extends ApiKeySummary {
  key: string
}

export interface ApiKeysListResponse {
  apiKeys: ApiKeySummary[]
}

export interface CreateApiKeyResponse {
  apiKey: CreatedApiKey
}
