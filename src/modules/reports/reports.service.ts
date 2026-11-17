import { prisma } from '../../config/prisma';

export class ReportsService {
  static async getAdminStats() {
    const [
      totalUsers,
      totalStudents,
      totalTeachers,
      totalCourses,
      publishedCourses,
      totalEnrollments,
      totalAssignments,
      totalQuizzes,
      recentEnrollments,
      categoriesWithCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.course.count(),
      prisma.course.count({ where: { status: 'PUBLISHED' } }),
      prisma.enrollment.count(),
      prisma.assignment.count(),
      prisma.quiz.count(),
      prisma.enrollment.findMany({
        take: 5,
        orderBy: { enrolledAt: 'desc' },
        include: {
          course: { select: { title: true, slug: true } },
          student: {
            include: {
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
        },
      }),
      prisma.courseCategory.findMany({
        include: {
          _count: { select: { courses: true } },
        },
      }),
    ]);

    return {
      overview: {
        totalUsers,
        totalStudents,
        totalTeachers,
        totalCourses,
        publishedCourses,
        totalEnrollments,
        totalAssignments,
        totalQuizzes,
      },
      recentEnrollments,
      categoryDistribution: categoriesWithCount.map((c) => ({
        id: c.id,
        name: c.name,
        count: c._count.courses,
      })),
    };
  }

  static async getTeacherStats(teacherId: string) {
    const [courses, pendingGradingCount] = await Promise.all([
      prisma.course.findMany({
        where: { teacherId },
        include: {
          _count: {
            select: {
              enrollments: true,
              assignments: true,
              quizzes: true,
            },
          },
        },
      }),
      prisma.assignmentSubmission.count({
        where: {
          assignment: { course: { teacherId } },
          status: 'SUBMITTED',
        },
      }),
    ]);

    const totalCourses = courses.length;
    const totalStudentsEnrolled = courses.reduce((acc, c) => acc + c._count.enrollments, 0);
    const totalAssignments = courses.reduce((acc, c) => acc + c._count.assignments, 0);
    const totalQuizzes = courses.reduce((acc, c) => acc + c._count.quizzes, 0);

    return {
      totalCourses,
      totalStudentsEnrolled,
      totalAssignments,
      totalQuizzes,
      pendingGradingCount,
      courses,
    };
  }

  static async getStudentStats(studentId: string) {
    const [enrollments, submissions, quizAttempts, results, attendanceRecords] = await Promise.all([
      prisma.enrollment.findMany({
        where: { studentId },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              thumbnail: true,
              modules: {
                select: {
                  lessons: { select: { id: true } },
                },
              },
            },
          },
        },
      }),
      prisma.assignmentSubmission.findMany({
        where: { studentId },
        include: {
          assignment: { select: { title: true, maxScore: true, dueDate: true } },
        },
      }),
      prisma.quizAttempt.findMany({
        where: { studentId },
        include: {
          quiz: { select: { title: true } },
        },
      }),
      prisma.result.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.attendance.findMany({
        where: { studentId },
      }),
    ]);

    const totalCourses = enrollments.length;
    const totalSubmissions = submissions.length;
    const totalQuizAttempts = quizAttempts.length;

    // Attendance rate
    const totalAttendance = attendanceRecords.length;
    const presentAttendance = attendanceRecords.filter((a) => a.status === 'PRESENT').length;
    const attendanceRate = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 100;

    // Average Result Score
    const avgScore =
      results.length > 0
        ? Math.round(
            results.reduce((acc, r) => acc + (r.score / r.maxScore) * 100, 0) / results.length
          )
        : 0;

    return {
      totalCourses,
      totalSubmissions,
      totalQuizAttempts,
      attendanceRate,
      averageGradeScore: avgScore,
      recentResults: results,
      recentEnrollments: enrollments.slice(0, 4),
    };
  }
}
