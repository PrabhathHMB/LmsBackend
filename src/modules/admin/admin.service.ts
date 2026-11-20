import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error.utils';
import { hashPassword } from '../../utils/password.utils';
import { Role, CourseStatus, AttendanceStatus, FeePaymentStatus, PaymentMethod, SessionType } from '@prisma/client';

export class AdminService {
  /**
   * Complete Admin Dashboard Analytics & Summary
   */
  static async getDashboardStats() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [
      grades,
      students,
      courses,
      initialSessions,
      todaySessionsCount,
      todayAttendanceCount,
      todayAbsentCount,
      monthFeeRecords,
    ] = await Promise.all([
      prisma.courseCategory.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          defaultMonthlyFee: true,
        },
      }),
      prisma.student.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              isActive: true,
              createdAt: true,
            },
          },
          assignedGrade: { select: { id: true, name: true, slug: true, defaultMonthlyFee: true } },
          attendances: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true,
              status: true,
              sessionDate: true,
              createdAt: true,
            },
          },
          feeRecords: {
            where: { year: currentYear, month: currentMonth },
            select: {
              feeAmount: true,
              paidAmount: true,
              status: true,
              receiptNumber: true,
            },
          },
          _count: {
            select: { attendances: true, enrollments: true, certificates: true },
          },
        },
      }),
      prisma.course.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { name: true } },
          teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
          _count: { select: { enrollments: true } },
        },
      }),
      prisma.classSession.findMany({
        orderBy: { sessionDate: 'desc' },
        take: 30,
        include: {
          grade: { select: { name: true, slug: true } },
          _count: { select: { attendances: true } },
        },
      }),
      prisma.classSession.count({
        where: { sessionDate: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.attendance.count({
        where: {
          sessionDate: { gte: todayStart, lte: todayEnd },
          status: AttendanceStatus.PRESENT,
        },
      }),
      prisma.attendance.count({
        where: {
          sessionDate: { gte: todayStart, lte: todayEnd },
          status: AttendanceStatus.ABSENT,
        },
      }),
      prisma.feeRecord.findMany({
        where: { year: currentYear, month: currentMonth },
        select: { feeAmount: true, paidAmount: true, status: true },
      }),
    ]);

    const formattedStudents = students.map((s) => {
      const totalSessions = s.attendances.length;
      const presentCount = s.attendances.filter(
        (a) => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE
      ).length;
      const attendancePct = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 100;
      const currentFee = s.feeRecords[0];

      return {
        id: s.id,
        userId: s.user.id,
        name: `${s.user.firstName} ${s.user.lastName}`.trim(),
        email: s.user.email,
        isActive: s.user.isActive,
        studentPhone: s.studentPhone || s.user.phone,
        parentPhone: s.parentPhone,
        address: s.address,
        assignedGradeId: s.assignedGradeId,
        gradeName: s.assignedGrade?.name || 'Unassigned',
        gradeSlug: s.assignedGrade?.slug,
        attendancePercentage: attendancePct,
        totalSessions,
        currentFeeStatus: currentFee?.status || 'UNPAID',
        currentFeePaid: currentFee ? Number(currentFee.paidAmount) : 0,
        currentFeeTotal: currentFee ? Number(currentFee.feeAmount) : Number(s.assignedGrade?.defaultMonthlyFee || 2000),
        receiptNumber: currentFee?.receiptNumber || null,
        createdAt: s.user.createdAt,
      };
    });

    const totalActiveStudents = formattedStudents.filter((s) => s.isActive).length;

    const gradeCounts: Record<string, number> = {};
    grades.forEach((g) => {
      gradeCounts[g.name] = 0;
    });
    formattedStudents.forEach((s) => {
      if (s.gradeName && gradeCounts[s.gradeName] !== undefined) {
        gradeCounts[s.gradeName] = (gradeCounts[s.gradeName] || 0) + 1;
      }
    });

    const feesCollectedThisMonth = monthFeeRecords.reduce(
      (sum, r) => sum + Number(r.paidAmount || 0),
      0
    );
    const totalFeesDueThisMonth = monthFeeRecords.reduce(
      (sum, r) => sum + Number(r.feeAmount || 0),
      0
    );
    const outstandingClassFees = Math.max(0, totalFeesDueThisMonth - feesCollectedThisMonth);

    const unpaidOrPartialStudentsCount = formattedStudents.filter(
      (s) => s.currentFeeStatus === 'UNPAID' || s.currentFeeStatus === 'PARTIALLY_PAID' || s.currentFeeStatus === 'OVERDUE'
    ).length;

    return {
      grades,
      students: formattedStudents,
      totalStudentsCount: formattedStudents.length,
      totalActiveStudents,
      courses,
      sessions: initialSessions,
      todaySessionsCount,
      todayAttendanceCount,
      todayAbsentCount,
      feesCollectedThisMonth,
      outstandingClassFees,
      unpaidOrPartialStudentsCount,
      gradeCounts,
    };
  }

  /**
   * Get Student Directory
   */
  static async getStudents(gradeId?: string, search?: string) {
    const studentWhere: any = {};
    if (gradeId) studentWhere.assignedGradeId = gradeId;
    if (search) {
      studentWhere.OR = [
        { studentPhone: { contains: search } },
        { parentPhone: { contains: search } },
        { user: { firstName: { contains: search } } },
        { user: { lastName: { contains: search } } },
        { user: { email: { contains: search } } },
      ];
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const students = await prisma.student.findMany({
      where: studentWhere,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            isActive: true,
            createdAt: true,
          },
        },
        assignedGrade: {
          select: {
            id: true,
            name: true,
            slug: true,
            defaultMonthlyFee: true,
          },
        },
        attendances: { select: { status: true } },
        feeRecords: {
          where: { year: currentYear, month: currentMonth },
          select: {
            feeAmount: true,
            paidAmount: true,
            status: true,
            receiptNumber: true,
          },
        },
      },
    });

    return students.map((s) => {
      const totalSessions = s.attendances.length;
      const presentCount = s.attendances.filter((a) => a.status === AttendanceStatus.PRESENT).length;
      const attendancePct = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 100;
      const currentFee = s.feeRecords[0];

      return {
        id: s.id,
        userId: s.user.id,
        name: `${s.user.firstName} ${s.user.lastName}`.trim(),
        email: s.user.email,
        isActive: s.user.isActive,
        studentPhone: s.studentPhone,
        parentPhone: s.parentPhone,
        address: s.address,
        assignedGradeId: s.assignedGradeId,
        gradeName: s.assignedGrade?.name || 'Unassigned',
        gradeSlug: s.assignedGrade?.slug,
        attendancePercentage: attendancePct,
        totalSessions,
        currentFeeStatus: currentFee?.status || 'UNPAID',
        currentFeePaid: currentFee ? Number(currentFee.paidAmount) : 0,
        currentFeeTotal: currentFee ? Number(currentFee.feeAmount) : Number(s.assignedGrade?.defaultMonthlyFee || 2000),
        receiptNumber: currentFee?.receiptNumber || null,
        createdAt: s.user.createdAt,
      };
    });
  }

  /**
   * Register a new student directly from Admin panel
   */
  static async createStudent(data: {
    name: string;
    email: string;
    password?: string;
    assignedGradeId: string;
    studentPhone?: string;
    parentPhone?: string;
    address?: string;
    isActive?: boolean;
  }) {
    const { name, email, password, assignedGradeId, studentPhone, parentPhone, address, isActive } = data;

    if (!name || !email || !assignedGradeId) {
      throw ApiError.badRequest('Name, email, and grade are required.');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw ApiError.conflict('A user with this email address already exists.');
    }

    const passwordHash = await hashPassword(password || 'Student123!');
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || 'Student';
    const lastName = nameParts.slice(1).join(' ') || '';

    const grade = await prisma.courseCategory.findUnique({ where: { id: assignedGradeId } });
    const defaultFee = grade ? Number(grade.defaultMonthlyFee) : 2000.0;

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: normalizedEmail,
        passwordHash,
        role: Role.STUDENT,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        phone: studentPhone || null,
        studentProfile: {
          create: {
            assignedGradeId,
            studentPhone: studentPhone ? studentPhone.trim() : null,
            parentPhone: parentPhone ? parentPhone.trim() : null,
            address: address ? address.trim() : null,
            feeRecords: {
              create: {
                gradeId: assignedGradeId,
                year: new Date().getFullYear(),
                month: new Date().getMonth() + 1,
                feeAmount: defaultFee,
                paidAmount: 0.0,
                status: FeePaymentStatus.UNPAID,
              },
            },
          },
        },
      },
      include: {
        studentProfile: { include: { assignedGrade: true } },
      },
    });

    return user;
  }

  /**
   * Update student profile, grade, or password
   */
  static async updateStudent(id: string, data: any) {
    const student = await prisma.student.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!student) {
      throw ApiError.notFound('Student not found');
    }

    const { name, email, assignedGradeId, studentPhone, parentPhone, address, isActive, newPassword } = data;

    if (name || email || isActive !== undefined || newPassword) {
      const userUpdate: any = {};
      if (name) {
        const parts = name.trim().split(' ');
        userUpdate.firstName = parts[0];
        userUpdate.lastName = parts.slice(1).join(' ');
      }
      if (email) userUpdate.email = email.toLowerCase().trim();
      if (isActive !== undefined) userUpdate.isActive = Boolean(isActive);
      if (newPassword && newPassword.trim().length >= 6) {
        userUpdate.passwordHash = await hashPassword(newPassword.trim());
      }
      await prisma.user.update({
        where: { id: student.userId },
        data: userUpdate,
      });
    }

    const studentUpdate: any = {};
    if (assignedGradeId) studentUpdate.assignedGradeId = assignedGradeId;
    if (studentPhone !== undefined) studentUpdate.studentPhone = studentPhone;
    if (parentPhone !== undefined) studentUpdate.parentPhone = parentPhone;
    if (address !== undefined) studentUpdate.address = address;

    const updated = await prisma.student.update({
      where: { id },
      data: studentUpdate,
      include: {
        user: true,
        assignedGrade: true,
      },
    });

    return updated;
  }

  /**
   * Get Student by ID
   */
  static async getStudentById(id: string) {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        user: true,
        assignedGrade: true,
        attendances: {
          orderBy: { createdAt: 'desc' },
          include: { session: true },
        },
        feeRecords: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
        },
        enrollments: {
          include: { course: true },
        },
      },
    });

    if (!student) {
      throw ApiError.notFound('Student not found');
    }

    return student;
  }
}
