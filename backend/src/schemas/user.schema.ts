import { z } from 'zod';

export const userIdParamSchema = z.object({
  id: z.string().min(1),
});

export const employeeLookupParamSchema = z.object({
  unit: z.enum(['PEDERTRACTOR', 'TRACTOR']),
  cardNumber: z.string().min(1),
});

export const createUserSchema = z.object({
  cardNumber: z.string().min(1),
  unit: z.enum(['PEDERTRACTOR', 'TRACTOR']),
  printerOperator: z.boolean().optional().default(false),
  teamId: z.string().min(1).optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['ADMIN', 'LEADER', 'USER']),
  printerOperator: z.boolean(),
});
