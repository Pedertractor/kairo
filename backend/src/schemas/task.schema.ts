import { z } from 'zod';

export const projectIdParamSchema = z.object({
  projectId: z.string().min(1),
});

export const taskParamSchema = z.object({
  projectId: z.string().min(1),
  taskId: z.string().min(1),
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Título é obrigatório'),
  description: z.string().trim().optional(),
  estimatedHours: z.coerce
    .number()
    .positive('Horas estimadas deve ser um valor positivo')
    .optional(),
});
