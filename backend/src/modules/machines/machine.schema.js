import { z } from 'zod';

export const createMachineSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Machine name required'),
    type: z.string().min(2, 'Machine type required'),
    installDate: z.string().optional(),
  }),
});

export const updateMachineStatusSchema = z.object({
  body: z.object({
    status: z.enum(['ACTIVE', 'IDLE', 'FAULT', 'MAINTENANCE']),
    efficiencyPct: z.number().min(0).max(100).optional(),
  }),
});

export const logFaultSchema = z.object({
  body: z.object({
    faultDescription: z.string().min(3, 'Fault description is required'),
  }),
});
