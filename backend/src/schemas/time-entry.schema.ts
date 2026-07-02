import { z } from 'zod';

export const dayDashboardQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida')
    .optional(),
});

export const taskTimeEntryParamSchema = z.object({
  projectId: z.string().min(1),
  taskId: z.string().min(1),
  timeEntryId: z.string().min(1),
});

export const timeEntryIdParamSchema = z.object({
  timeEntryId: z.string().min(1),
});

export const listTaskTimeEntriesQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const listUserTimeEntriesQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(6),
});

export const updateTaskTimeEntrySchema = z
  .object({
    startedAt: z.string().datetime({ message: 'Data de início inválida' }),
    endedAt: z
      .string()
      .datetime({ message: 'Data de fim inválida' })
      .nullable(),
  })
  .refine(
    (data) => {
      if (!data.endedAt) {
        return true;
      }

      return new Date(data.startedAt) < new Date(data.endedAt);
    },
    { message: 'A data de início deve ser anterior à data de fim' },
  );

export const updateTimeEntrySchema = updateTaskTimeEntrySchema;
