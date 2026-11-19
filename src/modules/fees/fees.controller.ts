import { Request, Response, NextFunction } from 'express';
import { FeesService } from './fees.service';
import { sendSuccess } from '../../utils/response.utils';
import { ApiError } from '../../utils/api-error.utils';
import { PaymentMethod } from '@prisma/client';

export class FeesController {
  static async getMonthlyLedger(req: Request, res: Response, next: NextFunction) {
    try {
      const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
      const month = req.query.month ? parseInt(req.query.month as string, 10) : new Date().getMonth() + 1;
      const gradeId = req.query.gradeId as string | undefined;

      const ledger = await FeesService.getMonthlyLedger(year, month, gradeId);
      return sendSuccess(res, ledger, 'Monthly fee ledger fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async recordPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId, gradeId, year, month, feeAmount, paidAmount, paymentMethod, note } = req.body;

      if (!studentId || !year || !month) {
        throw ApiError.badRequest('studentId, year, and month are required');
      }

      const record = await FeesService.recordPayment({
        studentId,
        gradeId,
        year: Number(year),
        month: Number(month),
        feeAmount: Number(feeAmount) || 0,
        paidAmount: Number(paidAmount) || 0,
        paymentMethod: paymentMethod || PaymentMethod.CASH,
        note,
      });

      return sendSuccess(res, record, 'Fee payment recorded successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getStudentFeeHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId } = req.params;
      const records = await FeesService.getStudentFeeHistory(studentId);
      return sendSuccess(res, records, 'Student fee history fetched');
    } catch (error) {
      next(error);
    }
  }

  static async getMyFees(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) {
        throw ApiError.forbidden('Only students can access fee status');
      }

      const records = await FeesService.getStudentFeeHistory(studentId);
      return sendSuccess(res, records, 'Fee history fetched');
    } catch (error) {
      next(error);
    }
  }

  static async updateGradeFee(req: Request, res: Response, next: NextFunction) {
    try {
      const { gradeId } = req.params;
      const { defaultMonthlyFee } = req.body;

      if (defaultMonthlyFee === undefined || isNaN(Number(defaultMonthlyFee))) {
        throw ApiError.badRequest('Valid defaultMonthlyFee is required');
      }

      const updated = await FeesService.updateGradeFee(gradeId, Number(defaultMonthlyFee));
      return sendSuccess(res, updated, 'Default monthly fee updated successfully');
    } catch (error) {
      next(error);
    }
  }
}
