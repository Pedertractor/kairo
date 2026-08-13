import { z } from 'zod';

export const listClientsQuerySchema = z.object({
  q: z.string().trim().optional(),
});
