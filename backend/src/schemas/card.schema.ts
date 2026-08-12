import { z } from 'zod';

export const teamIdParamSchema = z.object({
  teamId: z.string().min(1),
});

export const activityParamSchema = z.object({
  teamId: z.string().min(1),
  activityId: z.string().min(1),
});

export const projectParamSchema = z.object({
  teamId: z.string().min(1),
  projectId: z.string().min(1),
});

export const projectIdParamSchema = z.object({
  projectId: z.string().min(1),
});

export const cardStatusSchema = z.enum([
  'TODO',
  'IN_PROGRESS',
  'PAUSED',
  'DONE',
  'CANCELED',
]);

export const updateActivityStatusSchema = z.object({
  status: cardStatusSchema,
});

export const updateActivitySchema = z
  .object({
    title: z.string().trim().min(1, 'Título é obrigatório').optional(),
    status: cardStatusSchema.optional(),
    tagId: z.string().min(1).nullable().optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.status !== undefined ||
      data.tagId !== undefined,
    { message: 'Informe ao menos um campo para atualizar' },
  );

export const createActivitySchema = z.object({
  title: z.string().trim().min(1, 'Título é obrigatório'),
  description: z.string().trim().optional(),
  estimatedHours: z.coerce
    .number()
    .positive('Horas estimadas deve ser um valor positivo')
    .optional(),
  tagId: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
});

export const createProjectSchema = createActivitySchema;

export const updateProjectStatusSchema = updateActivityStatusSchema;

export const updateProjectSchema = updateActivitySchema;
