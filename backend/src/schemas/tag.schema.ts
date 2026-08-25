import { z } from 'zod';

export const teamIdParamSchema = z.object({
  teamId: z.string().min(1),
});

export const createTagSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida'),
});

export const tagParamSchema = z.object({
  teamId: z.string().min(1),
  tagId: z.string().min(1),
});

export const updateTagSchema = z
  .object({
    name: z.string().trim().min(1, 'Nome é obrigatório').optional(),
    color: z
      .string()
      .trim()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida')
      .optional(),
  })
  .refine((data) => data.name !== undefined || data.color !== undefined, {
    message: 'Informe ao menos um campo para atualizar',
  });
