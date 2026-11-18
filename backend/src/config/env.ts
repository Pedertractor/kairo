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
  UPLOAD_DIR: z.string().min(1).default('uploads'),
  CORREIO: z.preprocess((value) => value === '' ? undefined : value, z.string().min(1).optional()),
  PORT_CORREIO: z.coerce.number().int().min(1).max(65535).default(587),
  EMAIL_AUTOMACAO: z.preprocess((value) => value === '' ? undefined : value, z.email().optional()),
  PASSWORD_AUTOMACAO: z.preprocess((value) => value === '' ? undefined : value, z.string().min(1).optional()),
  PUBLIC_FRONTEND_URL: z.preprocess((value) => value === '' ? undefined : value, z.url().optional()),
  ORION_URL: z.string().url('ORION_URL deve ser uma URL válida').optional(),
  ORION_APP_TOKEN: z.string().min(1).optional(),
  P5_INFRACTIONS_API_URL: z.string().url().optional(),
  P5_INFRACTIONS_API_KEY: z.string().min(1).optional(),
  SOLICITATION_WEBHOOK_URL: z.string().url().optional(),
  SOLICITATION_WEBHOOK_SECRET: z.string().min(32).optional(),
}).refine((value) => Boolean(value.SOLICITATION_WEBHOOK_URL) === Boolean(value.SOLICITATION_WEBHOOK_SECRET), {
  message: 'Configure SOLICITATION_WEBHOOK_URL e SOLICITATION_WEBHOOK_SECRET juntos',
  path: ['SOLICITATION_WEBHOOK_URL'],
}).refine((value) => Boolean(value.P5_INFRACTIONS_API_URL) === Boolean(value.P5_INFRACTIONS_API_KEY), {
  message: 'Configure P5_INFRACTIONS_API_URL e P5_INFRACTIONS_API_KEY juntos',
  path: ['P5_INFRACTIONS_API_URL'],
}).refine((value) => {
  const supplied = [value.CORREIO, value.EMAIL_AUTOMACAO, value.PASSWORD_AUTOMACAO];
  return supplied.every(Boolean) || supplied.every((item) => !item);
}, {
  message: 'Configure CORREIO, EMAIL_AUTOMACAO e PASSWORD_AUTOMACAO juntos',
  path: ['CORREIO'],
}).refine((value) => value.NODE_ENV !== 'production' || !value.CORREIO ||
  Boolean(value.PUBLIC_FRONTEND_URL?.startsWith('https://')), {
  message: 'Configure PUBLIC_FRONTEND_URL com a URL HTTPS do Kairo em produção',
  path: ['PUBLIC_FRONTEND_URL'],
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
