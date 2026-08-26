import { z } from 'zod';

export const openShiftSchema = z.object({
  body: z.object({
    type: z.enum(['MORNING', 'AFTERNOON', 'NIGHT']),
  }),
});
