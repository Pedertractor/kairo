import { z } from 'zod';

export const teamIdParamSchema = z.object({
  teamId: z.string().min(1),
  projectId: z.string().min(1).optional(),
});

export const documentIdParamSchema = z.object({
  teamId: z.string().min(1),
  projectId: z.string().min(1).optional(),
  documentId: z.string().min(1),
});
