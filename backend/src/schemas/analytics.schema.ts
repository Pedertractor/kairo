import { z } from 'zod';

const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida');

export const analyticsQuerySchema = z
  .object({
    startDate: dateKeySchema.optional(),
    endDate: dateKeySchema.optional(),
    teamId: z.string().min(1).optional(),
    employeeId: z.string().min(1).optional(),
    projectId: z.string().min(1).optional(),
  })
  .refine(
    (query) =>
      (query.startDate === undefined && query.endDate === undefined) ||
      (query.startDate !== undefined && query.endDate !== undefined),
    { message: 'Informe startDate e endDate juntos' },
  )
  .refine(
    (query) =>
      !query.startDate ||
      !query.endDate ||
      query.startDate <= query.endDate,
    { message: 'startDate deve ser anterior ou igual a endDate' },
  );
