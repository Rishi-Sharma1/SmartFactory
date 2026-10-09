import { z } from 'zod';

export const createFactorySchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Factory name is required'),
    location: z.string().optional(),
    lines: z.array(
      z.object({
        name: z.string().min(1, 'Line name is required'),
        machines: z.array(
          z.object({
            name: z.string().min(1, 'Machine name is required'),
            type: z.string().optional(),
          })
        ).optional(),
      })
    ).optional(),
  }),
});


export const inviteMemberSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    role: z.enum(['MANAGER', 'SUPERVISOR', 'OPERATOR']),
  }),
});

export const updateMemberRoleSchema = z.object({
  body: z.object({
    role: z.enum(['OWNER', 'MANAGER', 'SUPERVISOR', 'OPERATOR']),
  }),
});

export const createMemberSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['OWNER', 'MANAGER', 'SUPERVISOR', 'OPERATOR']),
  }),
});

