import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error.utils';
import { SessionType, AttendanceStatus } from '@prisma/client';

export class SessionsService {
  /**
   * Create a new class session
   */
  static async createSession(data: {
    gradeId: string;
    title: string;
    description?: string;
    sessionDate: string;
    sessionType?: SessionType;
  }) {
    const grade = await prisma.courseCategory.findUnique({
      where: { id: data.gradeId },
    });

    if (!grade) {
      throw ApiError.notFound('Grade category not found');
    }

    const sessionDate = new Date(data.sessionDate);
    if (isNaN(sessionDate.getTime())) {
      throw ApiError.badRequest('Invalid session date format');
    }

    return prisma.classSession.create({
      data: {
        gradeId: data.gradeId,
        title: data.title,
        description: data.description || null,
        sessionDate,
        sessionType: data.sessionType || SessionType.PHYSICAL,
      },
      include: {
        grade: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * List class sessions with attendance summary
   */
  static async listSessions(gradeId?: string, startDate?: string, endDate?: string) {
    const where: any = {};
    if (gradeId) {
      where.gradeId = gradeId;
    }
    if (startDate || endDate) {
      where.sessionDate = {};
      if (startDate) where.sessionDate.gte = new Date(startDate);
      if (endDate) where.sessionDate.lte = new Date(endDate);
    }

    return prisma.classSession.findMany({
      where,
      orderBy: { sessionDate: 'desc' },
      include: {
        grade: { select: { id: true, name: true } },
        _count: {
          select: { attendances: true },
        },
      },
    });
  }

  /**
   * Get session details with student attendance roster
   */
  static async getSessionWithRoster(sessionId: string) {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: {
        grade: true,
        attendances: {
          include: {
            student: {
              include: {
                user: {
                  select: { firstName: true, lastName: true, email: true },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw ApiError.notFound('Class session not found');
    }

    // Get all students enrolled/assigned to this grade
    const studentsInGrade = await prisma.student.findMany({
      where: {
        assignedGradeId: session.gradeId,
        user: { isActive: true },
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: {
        user: { firstName: 'asc' },
      },
    });

    const attendanceMap = new Map<string, any>();
    session.attendances.forEach((att) => {
      attendanceMap.set(att.studentId, att);
    });

    const roster = studentsInGrade.map((student) => {
      const att = attendanceMap.get(student.id);
      return {
        studentId: student.id,
        studentName: `${student.user.firstName} ${student.user.lastName}`,
        studentEmail: student.user.email,
        studentPhone: student.studentPhone,
        status: att?.status || AttendanceStatus.ABSENT,
        remarks: att?.remarks || '',
        attendanceId: att?.id || null,
      };
    });

    return {
      session,
      roster,
    };
  }

  /**
   * Batch mark attendance for a session
   */
  static async recordBatchAttendance(
    sessionId: string,
    records: Array<{ studentId: string; status: AttendanceStatus; remarks?: string }>
  ) {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw ApiError.notFound('Class session not found');
    }

    const updates = records.map((record) => {
      return prisma.attendance.upsert({
        where: {
          studentId_sessionDate: {
            studentId: record.studentId,
            sessionDate: session.sessionDate,
          },
        },
        update: {
          sessionId: session.id,
          status: record.status,
          remarks: record.remarks || null,
        },
        create: {
          sessionId: session.id,
          studentId: record.studentId,
          sessionDate: session.sessionDate,
          status: record.status,
          remarks: record.remarks || null,
        },
      });
    });

    await prisma.$transaction(updates);

    return {
      sessionId,
      recordsCount: records.length,
      sessionDate: session.sessionDate,
    };
  }
}
