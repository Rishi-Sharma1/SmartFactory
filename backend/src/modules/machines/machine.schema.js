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
  body: z
    .object({
      faultDescription: z.string().optional(),
      description: z.string().optional(),
      severity: z.string().optional(),
      priority: z.string().optional(),
    })
    .refine(
      (data) => {
        const desc = data.faultDescription || data.description;
        return typeof desc === 'string' && desc.trim().length >= 3;
      },
      {
        message: 'Fault description is required and must be at least 3 characters',
        path: ['faultDescription'],
      }
    ),
});

