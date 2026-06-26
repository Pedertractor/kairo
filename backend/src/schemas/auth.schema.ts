import { z } from 'zod';

export const loginSchema = z.object({
  cardNumber: z.string().trim().min(1, 'Número do cartão é obrigatório'),
  unit: z.enum(['PEDERTRACTOR', 'TRACTOR']),
  password: z.string().min(1, 'Senha é obrigatória'),
});
