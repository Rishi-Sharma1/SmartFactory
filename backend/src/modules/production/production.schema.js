import { z } from 'zod';

export const updateProductionSchema = z.object({
  body: z.object({
    shiftId: z.string().uuid('Valid shiftId required'),
    lineId: z.string().min(1, 'lineId required'),
    producedUnits: z.number().int().min(0, 'producedUnits must be non-negative'),
    rejectedUnits: z.number().int().min(0, 'rejectedUnits must be non-negative').default(0),
    targetUnits: z.number().int().min(1, 'targetUnits must be at least 1').optional(),
    delayReason: z.string().optional(),
    notes: z.string().optional(),
    defects: z
      .array(
        z.object({
          count: z.number().int().min(1),
          reason: z.string().min(1),
          description: z.string().optional(),
        })
      )
      .optional(),
  }),
});

export const setProductionTargetSchema = z.object({
  body: z.object({
    shiftId: z.string().uuid(),
    lineId: z.string(),
    targetUnits: z.number().int().min(1, 'targetUnits must be at least 1'),
  }),
});
