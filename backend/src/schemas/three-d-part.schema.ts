import { z } from 'zod';

export const threeDPartIdParamSchema = z.object({
  id: z.string().min(1),
});

export const createThreeDPartSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
  code: z.string().trim().min(1, 'Código é obrigatório'),
  timeToPrint: z.number().int().positive('Tempo de impressão deve ser positivo'),
});

export const updateThreeDPartSchema = z
  .object({
    name: z.string().trim().min(1, 'Nome é obrigatório').optional(),
    code: z.string().trim().min(1, 'Código é obrigatório').optional(),
    timeToPrint: z
      .number()
      .int()
      .positive('Tempo de impressão deve ser positivo')
      .optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.code !== undefined ||
      data.timeToPrint !== undefined,
    { message: 'Informe ao menos um campo para atualizar' },
  );
