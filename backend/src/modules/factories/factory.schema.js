import { z } from 'zod';

export const createFactorySchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Factory name is required'),
    location: z.string().optional(),
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
