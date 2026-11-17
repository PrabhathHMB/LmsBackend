import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error.utils';
import { CourseLevel, CourseStatus, Role } from '@prisma/client';

export class CoursesService {
  static async listCourses(params: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    level?: CourseLevel;
    status?: CourseStatus;
    teacherId?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 12;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.status) {
      where.status = params.status;
    }

    if (params.categoryId) {
      where.categoryId = params.categoryId;
    }

    if (params.level) {
      where.level = params.level;
    }

    if (params.teacherId) {
      where.teacherId = params.teacherId;
    }

    if (params.search) {
      where.OR = [
        { title: { contains: params.search } },
        { description: { contains: params.search } },
      ];
    }

    const [total, courses] = await Promise.all([
      prisma.course.count({ where }),
      prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          teacher: {
            include: {
              user: {
                select: { firstName: true, lastName: true, avatarUrl: true },
              },
            },
          },
          _count: {
            select: {
              modules: true,
              enrollments: true,
            },
          },
        },
      }),
    ]);

    return {
      courses,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getCourseBySlug(slug: string, userId?: string) {
    const course = await prisma.course.findUnique({
      where: { slug },
      include: {
        category: true,
        teacher: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true },
            },
          },
        },
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
              include: {
                resources: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            assignments: true,
            quizzes: true,
          },
        },
      },
    });

    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    let isEnrolled = false;
    let enrollment = null;

    if (userId) {
      const student = await prisma.student.findUnique({ where: { userId } });
      if (student) {
        enrollment = await prisma.enrollment.findUnique({
          where: {
            studentId_courseId: {
              studentId: student.id,
              courseId: course.id,
            },
          },
        });
        isEnrolled = !!enrollment;
      }
    }

    return {
      ...course,
      isEnrolled,
      enrollment,
    };
  }

  static async getCourseById(id: string) {
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        category: true,
        teacher: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
              include: {
                resources: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    return course;
  }

  static async createCourse(data: {
    title: string;
    description: string;
    shortDescription?: string;
    thumbnail?: string;
    price?: number;
    level?: CourseLevel;
    categoryId: string;
    teacherId: string;
  }) {
    let slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const exists = await prisma.course.findUnique({ where: { slug } });
    if (exists) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    return prisma.course.create({
      data: {
        title: data.title,
        slug,
        description: data.description,
        shortDescription: data.shortDescription,
        thumbnail: data.thumbnail,
        price: data.price || 0.0,
        level: data.level || CourseLevel.BEGINNER,
        categoryId: data.categoryId,
        teacherId: data.teacherId,
        status: CourseStatus.DRAFT,
      },
      include: {
        category: true,
        teacher: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  static async updateCourse(id: string, teacherId: string, role: Role, data: any) {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    if (role !== Role.ADMIN && course.teacherId !== teacherId) {
      throw ApiError.forbidden('You do not have permission to edit this course');
    }

    return prisma.course.update({
      where: { id },
      data,
      include: {
        category: true,
        teacher: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  static async deleteCourse(id: string, teacherId: string, role: Role) {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    if (role !== Role.ADMIN && course.teacherId !== teacherId) {
      throw ApiError.forbidden('You do not have permission to delete this course');
    }

    return prisma.course.delete({ where: { id } });
  }
}
