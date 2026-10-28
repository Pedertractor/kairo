import { parseShiftBounds } from '../utils/shift.js';
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
  teamId: z.string().min(1).optional(),
  role: z.enum(['ADMIN', 'LEADER', 'USER']).default('USER'),
  production: z.boolean().default(false),
}).refine((data) => !data.production || data.role === 'USER', {
  message: 'Usuários de produção devem ter a função Usuário',
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['ADMIN', 'LEADER', 'USER']),
});

const timeSchema = z
  .string()
  .regex(/^\d{1,2}:\d{2}(?::\d{2})?$/, 'Horário inválido');

export const updateUserShiftSchema = z
  .object({
    start: timeSchema,
    end: timeSchema,
  })
  .refine(
    (data) => parseShiftBounds(data.start, data.end) !== null,
    { message: 'Horário de turno inválido. Entrada e saída devem ser diferentes' },
  );
