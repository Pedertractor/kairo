import { z } from 'zod';

export const listMachinesQuerySchema = z.object({
  q: z.string().trim().optional(),
});
