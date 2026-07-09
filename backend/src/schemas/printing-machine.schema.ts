import { z } from 'zod';

export const printingMachineIdParamSchema = z.object({
  id: z.string().min(1),
});

export const createPrintingMachineSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
  busy: z.boolean().optional().default(false),
});

export const updatePrintingMachineSchema = z
  .object({
    name: z.string().trim().min(1, 'Nome é obrigatório').optional(),
    busy: z.boolean().optional(),
  })
  .refine((data) => data.name !== undefined || data.busy !== undefined, {
    message: 'Informe ao menos um campo para atualizar',
  });
