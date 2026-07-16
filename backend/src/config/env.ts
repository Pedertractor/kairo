import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  DEFAULT_PASSWORD: z
    .string()
    .min(3, 'DEFAULT_PASSWORD deve ter pelo menos 3 caracteres'),
  API_BASE_URL: z
    .string()
    .url('API_BASE_URL deve ser uma URL válida')
    .optional(),
  API_BASE_KEY: z.string().min(1, 'API_BASE_KEY é obrigatório'),
  API_BASE_NAME_APPLICATION: z
    .string()
    .min(1, 'API_BASE_NAME_APPLICATION é obrigatório'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    'Invalid environment variables:',
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = parsed.data;
