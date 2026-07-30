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
