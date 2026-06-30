import { z } from 'zod';

export const teamIdParamSchema = z.object({
  teamId: z.string().min(1),
});

export const activityParamSchema = z.object({
  teamId: z.string().min(1),
  activityId: z.string().min(1),
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

export const createActivitySchema = z.object({
  title: z.string().trim().min(1, 'Título é obrigatório'),
  description: z.string().trim().optional(),
  estimatedHours: z.coerce
    .number()
    .positive('Horas estimadas deve ser um valor positivo')
    .optional(),
});
