import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error.utils';

export class StudentsService {
  static async listStudents(params: {
    page?: number;
    limit?: number;
    search?: string;
    gradeLevel?: string;
    teacherId?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.gradeLevel) {
      where.gradeLevel = params.gradeLevel;
    }

    if (params.teacherId) {
      where.enrollments = {
        some: {
          course: {
            teacherId: params.teacherId,
          },
        },
      };
    }

    if (params.search) {
      where.OR = [
        { studentIdNumber: { contains: params.search } },
        { studentPhone: { contains: params.search } },
        { parentPhone: { contains: params.search } },
        { user: { firstName: { contains: params.search } } },
        { user: { lastName: { contains: params.search } } },
        { user: { email: { contains: params.search } } },
      ];
    }

    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedGrade: {
            select: {
              id: true,
              name: true,
              defaultMonthlyFee: true,
            },
          },
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
          enrollments: {
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  teacherId: true,
                },
              },
            },
          },
          _count: {
            select: {
              enrollments: true,
              submissions: true,
              quizAttempts: true,
              certificates: true,
            },
          },
        },
      }),
    ]);

    return {
      students,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getStudentById(id: string) {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        assignedGrade: true,
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
        certificates: {
          include: {
            course: { select: { title: true, slug: true } },
          },
        },
        feeRecords: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 12,
        },
        enrollments: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
                thumbnail: true,
                teacherId: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            submissions: true,
            quizAttempts: true,
            results: true,
            certificates: true,
          },
        },
      },
    });

    if (!student) {
      throw ApiError.notFound('Student record not found');
    }

    return student;
  }

  static async updateStudent(id: string, data: {
    gradeLevel?: string;
    studentIdNumber?: string;
    dateOfBirth?: Date;
    firstName?: string;
    lastName?: string;
    phone?: string;
    studentPhone?: string;
    parentPhone?: string;
    address?: string;
    assignedGradeId?: string;
  }) {
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      throw ApiError.notFound('Student record not found');
    }

    const { firstName, lastName, phone, ...profileData } = data;

    const updated = await prisma.$transaction(async (tx) => {
      if (firstName || lastName || phone) {
        await tx.user.update({
          where: { id: student.userId },
          data: {
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(phone && { phone }),
          },
        });
      }

      return tx.student.update({
        where: { id },
        data: profileData,
        include: {
          assignedGrade: true,
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
