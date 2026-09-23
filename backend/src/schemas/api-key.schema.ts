import { z } from 'zod';

export const apiKeyScopeSchema = z.enum(['INTEGRATION', 'OCCUPATION']);

export const createApiKeySchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(80),
  scope: apiKeyScopeSchema.default('INTEGRATION'),
});

export const apiKeyIdParamSchema = z.object({
  id: z.string().min(1),
});
