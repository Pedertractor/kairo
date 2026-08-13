import { z } from 'zod';

export const setTeamCostCentersSchema = z.object({
  costCenterIds: z.array(z.string().min(1)),
});
