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

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email address is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    phone: z.string().optional(),
    role: z.nativeEnum(Role).optional(),
    isActive: z.boolean().optional(),
    // Student fields
    studentIdNumber: z.string().optional(),
    gradeLevel: z.string().optional(),
    studentPhone: z.string().optional(),
    parentPhone: z.string().optional(),
    address: z.string().optional(),
    assignedGradeId: z.string().optional(),
    courseId: z.string().optional(),
    // Teacher fields
    employeeId: z.string().optional(),
    qualification: z.string().optional(),
    specialization: z.string().optional(),
    bio: z.string().optional(),
    headline: z.string().optional(),
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
    // Optional profile fields
    studentIdNumber: z.string().optional(),
    gradeLevel: z.string().optional(),
    studentPhone: z.string().optional(),
    parentPhone: z.string().optional(),
    address: z.string().optional(),
    assignedGradeId: z.string().optional(),
    employeeId: z.string().optional(),
    qualification: z.string().optional(),
    specialization: z.string().optional(),
    bio: z.string().optional(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  }),
});
