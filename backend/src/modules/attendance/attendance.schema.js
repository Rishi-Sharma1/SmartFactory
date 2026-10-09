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
  params: z
    .object({
      id: z.string().optional(),
    })
    .optional(),
  body: z.object({
    userId: z.string().optional(),
    shiftId: z.string().optional(),
    status: z.enum(['PRESENT', 'ABSENT', 'LATE']),
  }),
});

export const addLabourSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Labour name must be at least 2 characters'),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    initialStatus: z.enum(['PRESENT', 'ABSENT', 'LATE', 'ON_LEAVE']).optional().default('PRESENT'),
    shiftId: z.string().optional(),
  }),
});
