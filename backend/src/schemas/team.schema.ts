import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
  description: z.string().trim().optional(),
});

export const updateTeamSchema = z
  .object({
    name: z.string().trim().min(1, 'Nome é obrigatório').optional(),
    description: z.string().trim().nullable().optional(),
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    { message: 'Informe ao menos um campo para atualizar' },
  );

export const teamIdParamSchema = z.object({
  id: z.string().min(1),
});

export const teamMemberParamSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
});

export const addTeamMemberSchema = z.object({
  userId: z.string().min(1, 'Usuário é obrigatório'),
});

export const updateMemberAbsentSchema = z.object({
  absent: z.boolean(),
});
