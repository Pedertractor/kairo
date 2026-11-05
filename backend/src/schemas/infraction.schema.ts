import { z } from 'zod';

const integerQuery = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int());

export const infractionsQuerySchema = z.object({
  month: integerQuery.pipe(z.number().min(1).max(12)),
  year: integerQuery.pipe(z.number().positive()),
});

const timeSummarySchema = z.object({
  percent: z.number().nonnegative(),
  loggedSeconds: z.number().nonnegative(),
  workedSeconds: z.number().nonnegative(),
});

export const infractionsResponseSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().positive(),
  totalPeople: z.number().int().nonnegative(),
  totalInfractions: z.number().int().nonnegative(),
  people: z.array(z.object({
    name: z.string(),
    cardNumber: z.string(),
    unit: z.string(),
    monthlyAverage: timeSummarySchema.extend({ percent: z.number().nonnegative().nullable() }),
    infractionCount: z.number().int().nonnegative(),
    infractions: z.array(timeSummarySchema.extend({
      date: z.iso.date(),
      type: z.string(),
    })),
  })),
});
