import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error.utils';
import { CourseLevel, CourseStatus, Role } from '@prisma/client';

export class CoursesService {
  static async listCourses(params: {
    page?: number;
    limit?: number;
    search?: string;
    q?: string;
    category?: string;
    categoryId?: string;
    stream?: string;
    price?: string;
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
    } else if (params.category) {
      where.category = { slug: params.category };
    } else if (params.stream === 'maths') {
      where.category = {
        slug: {
          in: [
            'grade-6-maths',
            'grade-7-maths',
            'grade-8-maths',
            'grade-9-maths',
            'grade-10-maths',
            'grade-11-maths',
          ],
        },
      };
    } else if (params.stream === 'al-sft') {
      where.category = { slug: 'al-sft' };
    }

    if (params.price === 'free') {
      where.price = 0;
    } else if (params.price === 'paid') {
      where.price = { gt: 0 };
    }

    if (params.level) {
      where.level = params.level;
    }

    if (params.teacherId) {
      where.teacherId = params.teacherId;
    }

    const searchQuery = params.search || params.q;
    if (searchQuery) {
      where.OR = [
        { title: { contains: searchQuery } },
        { description: { contains: searchQuery } },
        { shortDescription: { contains: searchQuery } },
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
                select: { id: true, firstName: true, lastName: true, avatarUrl: true },
              },
            },
          },
          modules: {
            include: {
              lessons: { select: { id: true, durationMinutes: true, durationSeconds: true } },
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
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getHomePageData() {
    const [categories, mathsCourses, sftCourses, totalStudents, totalCourses] = await Promise.all([
      prisma.courseCategory.findMany({ orderBy: { name: 'asc' } }),
      prisma.course.findMany({
        where: {
          status: CourseStatus.PUBLISHED,
          category: {
            slug: {
              in: [
                'grade-6-maths',
                'grade-7-maths',
                'grade-8-maths',
                'grade-9-maths',
                'grade-10-maths',
                'grade-11-maths',
              ],
            },
          },
        },
        include: {
          category: true,
          teacher: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, avatarUrl: true },
              },
            },
          },
          modules: { include: { lessons: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.course.findMany({
        where: {
          status: CourseStatus.PUBLISHED,
          category: { slug: 'al-sft' },
        },
        include: {
          category: true,
          teacher: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, avatarUrl: true },
              },
            },
          },
          modules: { include: { lessons: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.student.count(),
      prisma.course.count({ where: { status: CourseStatus.PUBLISHED } }),
    ]);

    return {
      categories,
      mathsCourses,
      sftCourses,
      stats: {
        totalStudents,
        totalCourses,
      },
    };
  }

  static async getCourseLearnData(courseIdOrSlug: string, studentId: string) {
    const course = await prisma.course.findFirst({
      where: {
        OR: [{ id: courseIdOrSlug }, { slug: courseIdOrSlug }],
      },
      include: {
        category: true,
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
              include: { resources: true },
            },
          },
        },
      },
    });

    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    const progress = await prisma.lessonProgress.findMany({
      where: {
        studentId,
        lesson: { module: { courseId: course.id } },
      },
    });

    const completedLessonIds = progress.filter((p) => p.isCompleted).map((p) => p.lessonId);
    const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
    const progressPercent = totalLessons > 0 ? Math.round((completedLessonIds.length / totalLessons) * 100) : 0;

    return {
      course,
      completedLessonIds,
      stats: {
        totalLessons,
        completedLessons: completedLessonIds.length,
        progressPercent,
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

  static async updateCourseStatus(
    id: string,
    status: CourseStatus,
    role: Role,
    teacherId?: string,
    rejectionReason?: string
  ) {
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        teacher: { include: { user: true } },
      },
    });

    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    if (role === Role.TEACHER) {
      if (course.teacherId !== teacherId) {
        throw ApiError.forbidden('You do not have permission to manage this course');
      }
      if (status !== CourseStatus.DRAFT && status !== CourseStatus.PENDING_REVIEW) {
        throw ApiError.badRequest('Teachers can only submit courses for review or revert to draft');
      }
    }

    const updated = await prisma.course.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === CourseStatus.REJECTED ? rejectionReason : null,
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

    if (role === Role.ADMIN && course.teacher?.user?.id) {
      let title = 'Course Status Updated';
      let message = `Your course "${course.title}" status has been updated to ${status}.`;
      let type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT' = 'INFO';

      if (status === CourseStatus.PUBLISHED) {
        title = '🎉 Course Approved & Published!';
        message = `Your course "${course.title}" has been approved by admin and is now live for students.`;
        type = 'SUCCESS';
      } else if (status === CourseStatus.REJECTED) {
        title = 'Course Needs Revision';
        message = `Your course "${course.title}" was not approved. Reason: ${rejectionReason || 'Please review guidelines.'}`;
        type = 'WARNING';
      }

      await prisma.notification.create({
        data: {
          userId: course.teacher.user.id,
          title,
          message,
          type,
          linkUrl: `/teacher/courses`,
        },
      });
    }

    return updated;
  }
}
