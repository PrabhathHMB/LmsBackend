import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error.utils';
import { AttendanceStatus } from '@prisma/client';

export class AttendanceService {
  static async recordAttendance(data: {
    courseId: string;
    sessionDate: string; // YYYY-MM-DD
    records: Array<{
      studentId: string;
      status: AttendanceStatus;
      remarks?: string;
    }>;
  }) {
    const course = await prisma.course.findUnique({ where: { id: data.courseId } });
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    const date = new Date(data.sessionDate);

    const operations = data.records.map((rec) => {
      return prisma.attendance.upsert({
        where: {
          studentId_sessionDate: {
            studentId: rec.studentId,
            sessionDate: date,
          },
        },
        update: {
          courseId: data.courseId,
          status: rec.status,
          remarks: rec.remarks,
        },
        create: {
          courseId: data.courseId,
          studentId: rec.studentId,
          sessionDate: date,
          status: rec.status,
          remarks: rec.remarks,
        },
      });
    });

    const results = await prisma.$transaction(operations);
    return results;
  }

  static async getCourseAttendance(courseId: string, sessionDate?: string) {
    const where: any = { courseId };
    if (sessionDate) {
      where.sessionDate = new Date(sessionDate);
    }

    return prisma.attendance.findMany({
      where,
      orderBy: { sessionDate: 'desc' },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
  }

  static async getStudentAttendance(studentId: string, courseId?: string) {
    const where: any = { studentId };
    if (courseId) {
      where.courseId = courseId;
    }

    return prisma.attendance.findMany({
      where,
      orderBy: { sessionDate: 'desc' },
      include: {
        course: { select: { id: true, title: true } },
      },
    });
  }
}
