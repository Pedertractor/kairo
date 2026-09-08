import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
  description: z.string().trim().optional(),
});

export const updateTeamSchema = z
  .object({
    name: z.string().trim().min(1, 'Nome é obrigatório').optional(),
    description: z.string().trim().nullable().optional(),
    membersCanCreateActivities: z.boolean().optional(),
    membersCanCreateProjects: z.boolean().optional(),
    membersCanViewTimeline: z.boolean().optional(),
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    { message: 'Informe ao menos um campo para atualizar' },
  );

export const listTeamsQuerySchema = z.object({
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value !== 'false'),
});

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

const dateTimeSchema = z.string().datetime({ message: 'Data e hora inválidas' });

export const updateMemberAbsentSchema = z
  .object({
    absent: z.boolean(),
    startDate: dateTimeSchema.optional(),
    endDate: dateTimeSchema.nullable().optional(),
  })
  .refine((data) => data.absent || data.startDate === undefined, {
    message: 'startDate só é permitido ao marcar ausência',
  })
  .refine(
    (data) =>
      !data.absent ||
      data.endDate === undefined ||
      data.endDate === null ||
      !data.startDate ||
      new Date(data.startDate) < new Date(data.endDate),
    { message: 'A data e hora de início devem ser anteriores ao fim' },
  );
