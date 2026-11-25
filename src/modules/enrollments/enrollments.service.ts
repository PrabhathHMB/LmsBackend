import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error.utils';
import { EnrollmentStatus, CourseStatus, AttendanceStatus } from '@prisma/client';

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

    let enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId: lesson.module.courseId,
        },
      },
    });

    if (!enrollment) {
      // Auto-enroll student into course if lesson allows free preview or demo
      enrollment = await prisma.enrollment.create({
        data: {
          studentId,
          courseId: lesson.module.courseId,
          status: 'ACTIVE',
        },
      });
    } else if (enrollment.status !== 'ACTIVE') {
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

    let progressRecord;
    if (existing) {
      const isCompleted = !existing.isCompleted;
      progressRecord = await prisma.lessonProgress.update({
        where: { id: existing.id },
        data: {
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
        },
      });
    } else {
      progressRecord = await prisma.lessonProgress.create({
        data: {
          studentId,
          lessonId,
          isCompleted: true,
          completedAt: new Date(),
        },
      });
    }

    // If marked completed, check if course is 100% complete to auto-issue certificate
    if (progressRecord.isCompleted) {
      const courseId = lesson.module.courseId;
      const totalLessons = await prisma.lesson.count({
        where: { module: { courseId } },
      });

      const completedLessons = await prisma.lessonProgress.count({
        where: {
          studentId,
          isCompleted: true,
          lesson: { module: { courseId } },
        },
      });

      if (totalLessons > 0 && completedLessons >= totalLessons) {
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: { status: EnrollmentStatus.COMPLETED },
        });

        const existingCert = await prisma.certificate.findUnique({
          where: {
            studentId_courseId: {
              studentId,
              courseId,
            },
          },
        });

        if (!existingCert) {
          const certCode = `CERT-${courseId.slice(-4).toUpperCase()}-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          await prisma.certificate.create({
            data: {
              certificateCode: certCode,
              studentId,
              courseId,
              grade: 'PASSED',
            },
          });

          const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { userId: true },
          });

          if (student) {
            await prisma.notification.create({
              data: {
                userId: student.userId,
                title: '🎓 Course Completed & Certificate Earned!',
                message: `Congratulations! You have completed all lessons. Your certificate code is ${certCode}.`,
                linkUrl: `/certificates/${certCode}`,
                type: 'SUCCESS',
              },
            });
          }
        }
      }
    }

    return progressRecord;
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

  static async getStudentDashboardData(studentId: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        assignedGrade: true,
      },
    });

    if (!student) {
      throw ApiError.notFound('Student record not found');
    }

    const [enrollments, certificates, attendances, latestFee] = await Promise.all([
      prisma.enrollment.findMany({
        where: { studentId },
        include: {
          course: {
            include: {
              category: true,
              teacher: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
              modules: {
                include: {
                  lessons: { select: { id: true, title: true, durationMinutes: true, durationSeconds: true } },
                },
              },
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      }),
      prisma.certificate.findMany({
        where: { studentId },
        include: {
          course: { select: { id: true, title: true, slug: true, thumbnail: true } },
        },
        orderBy: { issuedAt: 'desc' },
      }),
      prisma.attendance.findMany({
        where: { studentId },
        orderBy: { sessionDate: 'desc' },
        take: 10,
        include: {
          session: { select: { id: true, title: true, sessionDate: true, sessionType: true } },
        },
      }),
      prisma.feeRecord.findFirst({
        where: { studentId },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
    ]);

    let authorizedCourses: any[] = [];
    if (student.assignedGradeId) {
      authorizedCourses = await prisma.course.findMany({
        where: {
          categoryId: student.assignedGradeId,
          status: CourseStatus.PUBLISHED,
        },
        include: {
          category: true,
          teacher: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
          modules: { include: { lessons: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    const totalSessions = attendances.length;
    const attendedSessions = attendances.filter(
      (a) => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE
    ).length;
    const attendanceRate = totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 100;

    return {
      userProfile: {
        id: student.id,
        userId: student.userId,
        name: `${student.user.firstName} ${student.user.lastName}`.trim(),
        email: student.user.email,
        phone: student.studentPhone || student.user.phone,
        parentPhone: student.parentPhone,
        address: student.address,
        assignedGrade: student.assignedGrade,
      },
      enrollments,
      authorizedCourses,
      certificates,
      attendances,
      attendanceRate,
      latestFee,
    };
  }
}
