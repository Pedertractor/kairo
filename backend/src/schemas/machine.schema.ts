import { z } from 'zod';

export const listMachinesQuerySchema = z.object({
  q: z.string().trim().optional(),
  teamId: z.string().min(1).optional(),
});
