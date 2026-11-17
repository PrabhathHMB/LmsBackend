import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error.utils';
import { Role } from '@prisma/client';

export class UsersService {
  static async listUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: Role;
    isActive?: boolean;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.role) {
      where.role = params.role;
    }

    if (typeof params.isActive === 'boolean') {
      where.isActive = params.isActive;
    }

    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search } },
        { lastName: { contains: params.search } },
        { email: { contains: params.search } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phone: true,
          avatarUrl: true,
          isActive: true,
          createdAt: true,
          studentProfile: {
            select: { id: true, studentIdNumber: true, gradeLevel: true },
          },
          teacherProfile: {
            select: { id: true, employeeId: true, qualification: true, specialization: true },
          },
        },
      }),
    ]);

    return {
      users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        studentProfile: true,
        teacherProfile: true,
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const { passwordHash, refreshToken, ...sanitized } = user;
    return sanitized;
  }

  static async updateUser(id: string, data: any) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  static async deleteUser(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    await prisma.user.delete({ where: { id } });
    return true;
  }
}
