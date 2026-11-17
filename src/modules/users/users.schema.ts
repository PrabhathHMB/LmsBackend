import { z } from 'zod';
import { Role } from '@prisma/client';

export const listUsersSchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
    search: z.string().optional(),
    role: z.nativeEnum(Role).optional(),
    isActive: z.string().optional().transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    phone: z.string().optional(),
    avatarUrl: z.string().url().optional().or(z.literal('')),
    isActive: z.boolean().optional(),
    role: z.nativeEnum(Role).optional(),
  }),
});
