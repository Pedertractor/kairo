import { z } from 'zod';

export const projectIdParamSchema = z.object({
  projectId: z.string().min(1),
});

export const taskParamSchema = z.object({
  projectId: z.string().min(1),
  taskId: z.string().min(1),
});

export const complexityLevelSchema = z.enum([
  'BAIXA',
  'MEDIA',
  'ALTA',
  'MUITO_ALTA',
]);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Título é obrigatório'),
  description: z.string().trim().optional(),
  estimatedHours: z.coerce
    .number()
    .positive('Horas estimadas deve ser um valor positivo')
    .optional(),
  machineId: z.string().min(1).optional(),
  complexityLevel: complexityLevelSchema.optional(),
});

export const taskStatusSchema = z.enum([
  'TODO',
  'IN_PROGRESS',
  'PAUSED',
  'DONE',
  'CANCELED',
]);

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1, 'Título é obrigatório').optional(),
    status: taskStatusSchema.optional(),
    machineId: z.string().min(1).nullable().optional(),
    complexityLevel: complexityLevelSchema.nullable().optional(),
    estimatedHours: z.coerce
      .number()
      .positive('Horas estimadas deve ser um valor positivo')
      .nullable()
      .optional(),
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    { message: 'Informe ao menos um campo para atualizar' },
  );
