import { z } from 'zod';

// IDs are cuids today; the charset/length cap keeps arbitrary payloads out of
// Prisma queries and the audit trail.
const idSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/);

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida');

const isoDateTimeSchema = (message: string) =>
  z.string().datetime({ offset: true, message });

const noteSchema = z
  .string()
  .trim()
  .max(2000, 'A observação pode ter no máximo 2000 caracteres')
  .nullable()
  .transform((value) => (value ? value : null));

export const adminTimeEntryIdParamSchema = z
  .object({ timeEntryId: idSchema })
  .strict();

export const adminTimeEntryListQuerySchema = z
  .object({
    userId: idSchema.optional(),
    teamId: idSchema.optional(),
    from: dateKeySchema.optional(),
    to: dateKeySchema.optional(),
    type: z.enum(['TIMER', 'MANUAL']).optional(),
    activeOnly: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => value === 'true'),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()
  .refine((data) => !data.from || !data.to || data.from <= data.to, {
    message: 'A data inicial deve ser anterior ou igual à data final',
  });

export const adminWorkItemsQuerySchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    teamId: idSchema.optional(),
  })
  .strict();

export const createAdminTimeEntrySchema = z
  .object({
    userId: idSchema,
    cardId: idSchema.optional(),
    taskId: idSchema.optional(),
    startedAt: isoDateTimeSchema('Data de início inválida'),
    endedAt: isoDateTimeSchema('Data de fim inválida'),
    note: noteSchema.optional(),
  })
  .strict()
  .refine((data) => Boolean(data.cardId) !== Boolean(data.taskId), {
    message: 'Informe uma atividade ou uma tarefa',
  });

export const updateAdminTimeEntrySchema = z
  .object({
    cardId: idSchema.optional(),
    taskId: idSchema.optional(),
    startedAt: isoDateTimeSchema('Data de início inválida').optional(),
    endedAt: isoDateTimeSchema('Data de fim inválida').nullable().optional(),
    note: noteSchema.optional(),
  })
  .strict()
  .refine((data) => !(data.cardId && data.taskId), {
    message: 'Informe uma atividade ou uma tarefa, não as duas',
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Nenhuma alteração informada',
  });

export type AdminTimeEntryListQuery = z.infer<
  typeof adminTimeEntryListQuerySchema
>;
export type AdminWorkItemsQuery = z.infer<typeof adminWorkItemsQuerySchema>;
export type CreateAdminTimeEntryInput = z.infer<
  typeof createAdminTimeEntrySchema
>;
export type UpdateAdminTimeEntryInput = z.infer<
  typeof updateAdminTimeEntrySchema
>;
