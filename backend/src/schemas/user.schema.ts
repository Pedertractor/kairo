import { z } from 'zod';

export const userIdParamSchema = z.object({
  id: z.string().min(1),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['ADMIN', 'USER']),
});
