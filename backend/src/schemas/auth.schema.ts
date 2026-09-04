import { z } from 'zod';

import { MENSAGENS } from '../utils/response.js';

export const loginSchema = z.object({
  cardNumber: z.string().trim().min(1, 'Número do cartão é obrigatório'),
  unit: z.enum(['PEDERTRACTOR', 'TRACTOR']),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const changePasswordSchema = z
  .object({
    cardNumber: z.string().trim().min(1, 'Número do cartão é obrigatório'),
    unit: z.enum(['PEDERTRACTOR', 'TRACTOR']),
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z.string().min(1, 'Nova senha é obrigatória'),
    confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: MENSAGENS.SENHAS_NAO_COINCIDEM,
    path: ['confirmPassword'],
  });

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token é obrigatório'),
});

const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida');

export const updateAbsentSchema = z
  .object({
    absent: z.boolean(),
    startDate: dateKeySchema.optional(),
    endDate: dateKeySchema.nullable().optional(),
  })
  .refine((data) => data.absent || data.startDate === undefined, {
    message: 'startDate só é permitido ao marcar ausência',
  })
  .refine(
    (data) =>
      !data.absent ||
      data.endDate === undefined ||
      data.endDate === null ||
      !data.startDate ||
      data.startDate <= data.endDate,
    { message: 'startDate deve ser anterior ou igual a endDate' },
  );
