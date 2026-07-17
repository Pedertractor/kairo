import { z } from 'zod';

export const analyticsQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida')
    .optional(),
  teamId: z.string().min(1).optional(),
  employeeId: z.string().min(1).optional(),
});
