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
    (data) => {
      const [startH, startM] = data.start.split(':').map(Number);
      const [endH, endM] = data.end.split(':').map(Number);
      return endH * 60 + endM > startH * 60 + startM;
    },
    { message: 'O fim do turno deve ser posterior ao início' },
  );
