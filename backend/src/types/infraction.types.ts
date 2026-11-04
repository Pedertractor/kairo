import type { z } from 'zod';
import type { infractionsQuerySchema, infractionsResponseSchema } from '../schemas/infraction.schema.js';

export type InfractionsQuery = z.infer<typeof infractionsQuerySchema>;
export type InfractionsReport = z.infer<typeof infractionsResponseSchema>;
