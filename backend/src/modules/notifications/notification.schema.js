import { z } from 'zod';

export const updateConfigSchema = z.object({
  body: z.object({
    productionThresholdPct: z.number().int().min(1).max(100).optional(),
    rejectionThresholdPct: z.number().int().min(1).max(100).optional(),
    machineIdleMinutes: z.number().int().min(1).optional(),
  }),
});
