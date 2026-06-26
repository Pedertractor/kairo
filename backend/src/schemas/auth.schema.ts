import { z } from 'zod';

export const loginSchema = z.object({
  employeeId: z.string().trim().min(1, 'Matrícula é obrigatória'),
  password: z.string().min(1, 'Senha é obrigatória'),
});
