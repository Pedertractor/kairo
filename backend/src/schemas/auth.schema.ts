import { z } from 'zod';

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
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token é obrigatório'),
});
