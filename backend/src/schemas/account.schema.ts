import { z } from 'zod';
import { MENSAGENS } from '../utils/response.js';

export const updateProfileSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()).nullable(),
}).strict();

export const forgotPasswordSchema = z.object({
  cardNumber: z.string().trim().min(1).max(50),
  unit: z.enum(['PEDERTRACTOR', 'TRACTOR']),
}).strict();

export const actionTokenSchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict();

export const resetPasswordSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  newPassword: z.string().min(1),
  confirmPassword: z.string().min(1),
}).strict().refine((value) => value.newPassword === value.confirmPassword, {
  message: MENSAGENS.SENHAS_NAO_COINCIDEM, path: ['confirmPassword'],
});
