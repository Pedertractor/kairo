import { z } from 'zod';

export const teamIdParamSchema = z.object({
  teamId: z.string().min(1),
});

export const documentIdParamSchema = z.object({
  teamId: z.string().min(1),
  documentId: z.string().min(1),
});
