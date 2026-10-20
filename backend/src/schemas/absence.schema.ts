import { z } from 'zod';

const dateTimeSchema = z.string().datetime({ message: 'Data e hora inválidas' });

export const createAbsenceSchema = z
  .object({
    userId: z.string().min(1, 'Usuário é obrigatório'),
    startDate: dateTimeSchema,
    endDate: dateTimeSchema.nullable().optional(),
  })
  .refine(
    (data) =>
      data.endDate === undefined ||
      data.endDate === null ||
      new Date(data.startDate) < new Date(data.endDate),
    { message: 'A data e hora de início devem ser anteriores ao fim' },
  );

export const updateAbsenceSchema = z
  .object({
    userId: z.string().min(1, 'Usuário é obrigatório'),
    startDate: dateTimeSchema,
    endDate: dateTimeSchema.nullable().optional(),
  })
  .refine(
    (data) =>
      data.endDate === undefined ||
      data.endDate === null ||
      new Date(data.startDate) < new Date(data.endDate),
    { message: 'A data e hora de início devem ser anteriores ao fim' },
  );

export const absenceIdParamSchema = z.object({
  id: z.string().min(1),
});

export const adminAbsenceListQuerySchema = z.object({
  userId: z.string().min(1).optional(),
  createdById: z.string().min(1).optional(),
  status: z.enum(['scheduled', 'ongoing', 'finished']).optional(),
  from: dateTimeSchema.optional(),
  to: dateTimeSchema.optional(),
});
