import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['OWNER', 'MANAGER', 'SUPERVISOR', 'OPERATOR']).optional().default('OWNER'),
    factories: z
      .array(
        z.object({
          name: z.string().min(1, 'Factory name is required'),
          location: z.string().optional(),
          lines: z.array(z.string()).optional(),
          machines: z
            .array(
              z.object({
                name: z.string().min(1, 'Machine name is required'),
                type: z.string().min(1, 'Machine type is required'),
                status: z.enum(['ACTIVE', 'IDLE', 'FAULT', 'MAINTENANCE']).optional().default('ACTIVE'),
                efficiencyPct: z.number().optional().default(100),
              })
            )
            .optional(),
        })
      )
      .optional()
      .default([]),
  }),
});

