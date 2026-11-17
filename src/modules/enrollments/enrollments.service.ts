import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error.utils';
import { EnrollmentStatus } from '@prisma/client';

export class EnrollmentsService {
  static async enroll(studentId: string, courseId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        teacher: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    if (course.status !== 'PUBLISHED') {
      throw ApiError.badRequest('Course is not available for enrollment');
    }

    const existing = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId,
        },
      },
    });

    if (existing) {
      if (existing.status === EnrollmentStatus.ACTIVE) {
        throw ApiError.conflict('You are already enrolled in this course');
      }
      return prisma.enrollment.update({
        where: { id: existing.id },
        data: { status: EnrollmentStatus.ACTIVE, enrolledAt: new Date() },
      });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId,
        courseId,
        status: EnrollmentStatus.ACTIVE,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnail: true,
          },
        },
      },
    });

    // Create notification for student
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { userId: true },
    });

    if (student) {
      await prisma.notification.create({
        data: {
          userId: student.userId,
          title: 'Enrollment Confirmed',
          message: `You have successfully enrolled in ${course.title}. Start learning now!`,
          linkUrl: `/courses/${course.slug}`,
        },
      });
    }

    return enrollment;
  }

  static async getStudentEnrollments(studentId: string) {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      orderBy: { enrolledAt: 'desc' },
      include: {
        course: {
          include: {
            category: { select: { name: true, slug: true } },
            teacher: {
              include: {
                user: { select: { firstName: true, lastName: true, avatarUrl: true } },
              },
            },
            modules: {
              select: {
                id: true,
                lessons: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    // Calculate progress for each course
    const results = await Promise.all(
      enrollments.map(async (enr) => {
        const totalLessons = enr.course.modules.reduce(
          (acc, m) => acc + m.lessons.length,
          0
        );

        const lessonIds = enr.course.modules.flatMap((m) => m.lessons.map((l) => l.id));

        const completedCount = await prisma.lessonProgress.count({
          where: {
            studentId,
            lessonId: { in: lessonIds },
            isCompleted: true,
          },
        });

        const progressPercent =
          totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

        return {
          ...enr,
          progress: {
            totalLessons,
            completedLessons: completedCount,
            progressPercent,
          },
        };
      })
    );

    return results;
  }

  static async listAllEnrollments(params: {
    page?: number;
    limit?: number;
    courseId?: string;
    studentId?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 15;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.courseId) where.courseId = params.courseId;
    if (params.studentId) where.studentId = params.studentId;

    const [total, enrollments] = await Promise.all([
      prisma.enrollment.count({ where }),
      prisma.enrollment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { enrolledAt: 'desc' },
        include: {
          course: {
            select: { id: true, title: true, slug: true, thumbnail: true },
          },
          student: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      enrollments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async toggleLessonProgress(studentId: string, lessonId: string) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });

    if (!lesson) {
      throw ApiError.notFound('Lesson not found');
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId: lesson.module.courseId,
        },
      },
    });

    if (!enrollment || enrollment.status !== 'ACTIVE') {
      throw ApiError.forbidden('You must be actively enrolled in the course to track progress');
    }

    const existing = await prisma.lessonProgress.findUnique({
      where: {
        studentId_lessonId: {
          studentId,
          lessonId,
        },
      },
    });

    if (existing) {
      const isCompleted = !existing.isCompleted;
      return prisma.lessonProgress.update({
        where: { id: existing.id },
        data: {
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
        },
      });
    }

    return prisma.lessonProgress.create({
      data: {
        studentId,
        lessonId,
        isCompleted: true,
        completedAt: new Date(),
      },
    });
  }

  static async getCourseLearningData(slug: string, studentId: string) {
    const course = await prisma.course.findUnique({
      where: { slug },
      include: {
        category: true,
        teacher: {
          include: {
            user: { select: { firstName: true, lastName: true, avatarUrl: true } },
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
        assignments: {
          orderBy: { dueDate: 'asc' },
          include: {
            submissions: {
              where: { studentId },
            },
          },
        },
        quizzes: {
          where: { isPublished: true },
          include: {
            attempts: {
              where: { studentId },
              orderBy: { startedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId: course.id,
        },
      },
    });

    if (!enrollment) {
      throw ApiError.forbidden('You are not enrolled in this course');
    }

    const progressRecords = await prisma.lessonProgress.findMany({
      where: {
        studentId,
        lesson: {
          module: { courseId: course.id },
        },
      },
    });

    const completedLessonIds = new Set(
      progressRecords.filter((p) => p.isCompleted).map((p) => p.lessonId)
    );

    const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
    const completedCount = completedLessonIds.size;
    const progressPercent =
      totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    return {
      course,
      completedLessonIds: Array.from(completedLessonIds),
      stats: {
        totalLessons,
        completedCount,
        progressPercent,
      },
    };
  }
}
