import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error.utils';

export class TeachersService {
  static async listTeachers(params: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.search) {
      where.OR = [
        { employeeId: { contains: params.search } },
        { specialization: { contains: params.search } },
        { user: { firstName: { contains: params.search } } },
        { user: { lastName: { contains: params.search } } },
        { user: { email: { contains: params.search } } },
      ];
    }

    const [total, teachers] = await Promise.all([
      prisma.teacher.count({ where }),
      prisma.teacher.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatarUrl: true,
              isActive: true,
            },
          },
          _count: {
            select: {
              courses: true,
            },
          },
        },
      }),
    ]);

    return {
      teachers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getTeacherById(id: string) {
    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
            isActive: true,
            createdAt: true,
          },
        },
        courses: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnail: true,
            status: true,
            _count: {
              select: {
                enrollments: true,
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      throw ApiError.notFound('Teacher record not found');
    }

    return teacher;
  }

  static async updateTeacher(id: string, data: {
    employeeId?: string;
    qualification?: string;
    specialization?: string;
    bio?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }) {
    const teacher = await prisma.teacher.findUnique({ where: { id } });
    if (!teacher) {
      throw ApiError.notFound('Teacher record not found');
    }

    const { firstName, lastName, phone, ...profileData } = data;

    const updated = await prisma.$transaction(async (tx) => {
      if (firstName || lastName || phone) {
        await tx.user.update({
          where: { id: teacher.userId },
          data: {
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(phone && { phone }),
          },
        });
      }

      return tx.teacher.update({
        where: { id },
        data: profileData,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      });
    });

    return updated;
  }
}
