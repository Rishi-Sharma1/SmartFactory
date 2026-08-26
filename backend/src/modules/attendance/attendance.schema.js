import { z } from 'zod';

export const selfCheckInSchema = z.object({
  body: z.object({
    shiftId: z.string().uuid('Valid shiftId required'),
  }),
});

export const selfCheckOutSchema = z.object({
  params: z.object({
    id: z.string().uuid('Valid attendance ID required'),
  }),
});

export const markAttendanceSchema = z.object({
  body: z.object({
    userId: z.string().uuid('Valid worker userId required'),
    shiftId: z.string().uuid('Valid shiftId required'),
    status: z.enum(['PRESENT', 'ABSENT', 'LATE']),
  }),
});
