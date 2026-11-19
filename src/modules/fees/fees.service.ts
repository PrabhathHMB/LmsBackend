import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error.utils';
import { FeePaymentStatus, PaymentMethod } from '@prisma/client';

export class FeesService {
  /**
   * Get monthly fee ledger for a specific year, month, and optional grade
   */
  static async getMonthlyLedger(year: number, month: number, gradeId?: string) {
    const studentWhere: any = {
      user: { isActive: true },
    };
    if (gradeId) {
      studentWhere.assignedGradeId = gradeId;
    }

    const students = await prisma.student.findMany({
      where: studentWhere,
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
        assignedGrade: {
          select: {
            id: true,
            name: true,
            defaultMonthlyFee: true,
          },
        },
        feeRecords: {
          where: {
            year,
            month,
          },
        },
      },
      orderBy: {
        user: {
          firstName: 'asc',
        },
      },
    });

    let totalExpected = 0;
    let totalCollected = 0;
    let paidCount = 0;
    let unpaidCount = 0;

    const ledger = students.map((student) => {
      const existingRecord = student.feeRecords[0] || null;
      const expectedAmount = Number(
        existingRecord?.feeAmount ?? student.assignedGrade?.defaultMonthlyFee ?? 2000
      );
      const paidAmount = Number(existingRecord?.paidAmount ?? 0);
      const status: FeePaymentStatus = existingRecord?.status ?? FeePaymentStatus.UNPAID;

      totalExpected += expectedAmount;
      totalCollected += paidAmount;

      if (status === FeePaymentStatus.PAID) {
        paidCount++;
      } else {
        unpaidCount++;
      }

      return {
        studentId: student.id,
        studentName: `${student.user.firstName} ${student.user.lastName}`,
        studentEmail: student.user.email,
        studentPhone: student.studentPhone || student.user.phone,
        parentPhone: student.parentPhone,
        gradeId: student.assignedGradeId || gradeId || '',
        gradeName: student.assignedGrade?.name || 'Unassigned Grade',
        year,
        month,
        feeRecordId: existingRecord?.id || null,
        feeAmount: expectedAmount,
        paidAmount,
        status,
        paymentMethod: existingRecord?.paymentMethod || null,
        receiptNumber: existingRecord?.receiptNumber || null,
        note: existingRecord?.note || null,
        paidAt: existingRecord?.paidAt || null,
      };
    });

    return {
      year,
      month,
      summary: {
        totalStudents: students.length,
        paidCount,
        unpaidCount,
        totalExpected,
        totalCollected,
        balancePending: totalExpected - totalCollected,
      },
      ledger,
    };
  }

  /**
   * Record or update a student's monthly fee payment
   */
  static async recordPayment(data: {
    studentId: string;
    gradeId?: string;
    year: number;
    month: number;
    feeAmount: number;
    paidAmount: number;
    paymentMethod: PaymentMethod;
    note?: string;
  }) {
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      include: { assignedGrade: true, user: true },
    });

    if (!student) {
      throw ApiError.notFound('Student not found');
    }

    const resolvedGradeId = data.gradeId || student.assignedGradeId;
    if (!resolvedGradeId) {
      throw ApiError.badRequest('Student has no assigned grade. Please provide gradeId or assign a grade first.');
    }

    const feeAmount = data.feeAmount || Number(student.assignedGrade?.defaultMonthlyFee || 2000);
    const paidAmount = data.paidAmount;

    let status: FeePaymentStatus = FeePaymentStatus.UNPAID;
    if (paidAmount >= feeAmount) {
      status = FeePaymentStatus.PAID;
    } else if (paidAmount > 0) {
      status = FeePaymentStatus.PARTIALLY_PAID;
    }

    const receiptSuffix = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = `REC-${data.year}${String(data.month).padStart(2, '0')}-${receiptSuffix}`;

    const feeRecord = await prisma.feeRecord.upsert({
      where: {
        studentId_year_month: {
          studentId: data.studentId,
          year: data.year,
          month: data.month,
        },
      },
      update: {
        gradeId: resolvedGradeId,
        feeAmount,
        paidAmount,
        status,
        paymentMethod: data.paymentMethod,
        receiptNumber: paidAmount > 0 ? receiptNumber : null,
        note: data.note || null,
        paidAt: paidAmount > 0 ? new Date() : null,
      },
      create: {
        studentId: data.studentId,
        gradeId: resolvedGradeId,
        year: data.year,
        month: data.month,
        feeAmount,
        paidAmount,
        status,
        paymentMethod: data.paymentMethod,
        receiptNumber: paidAmount > 0 ? receiptNumber : null,
        note: data.note || null,
        paidAt: paidAmount > 0 ? new Date() : null,
      },
    });

    if (paidAmount > 0) {
      await prisma.notification.create({
        data: {
          userId: student.userId,
          title: 'Tuition Fee Payment Recorded',
          message: `Your payment of LKR ${paidAmount} for ${data.year}/${String(data.month).padStart(2, '0')} has been recorded (Receipt #${feeRecord.receiptNumber || receiptNumber}).`,
          type: 'SUCCESS',
        },
      });
    }

    return feeRecord;
  }

  /**
   * Get all fee records for a specific student
   */
  static async getStudentFeeHistory(studentId: string) {
    return prisma.feeRecord.findMany({
      where: { studentId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: {
        grade: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Update default monthly tuition fee for a grade category
   */
  static async updateGradeFee(gradeId: string, defaultMonthlyFee: number) {
    const category = await prisma.courseCategory.findUnique({ where: { id: gradeId } });
    if (!category) {
      throw ApiError.notFound('Grade category not found');
    }

    return prisma.courseCategory.update({
      where: { id: gradeId },
      data: {
        defaultMonthlyFee,
      },
    });
  }
}
