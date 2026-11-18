import { z } from 'zod';

export const supervisorQuerySchema = z.object({
  supervisorId: z.string().trim().min(1).optional(),
});

export const supervisorLeaderParamSchema = z.object({
  leaderId: z.string().trim().min(1),
});
