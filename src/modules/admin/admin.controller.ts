import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { SessionsService } from '../sessions/sessions.service';
import { FeesService } from '../fees/fees.service';
import { CoursesService } from '../courses/courses.service';
import { sendSuccess, sendCreated } from '../../utils/response.utils';
import { ApiError } from '../../utils/api-error.utils';

export class AdminController {
  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AdminService.getDashboardStats();
      return sendSuccess(res, data, 'Admin dashboard metrics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getStudents(req: Request, res: Response, next: NextFunction) {
    try {
      const gradeId = req.query.gradeId as string | undefined;
      const search = req.query.search as string | undefined;
      const students = await AdminService.getStudents(gradeId, search);
      return sendSuccess(res, { students }, 'Students directory retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async createStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const student = await AdminService.createStudent(req.body);
      return sendCreated(res, student, 'Student registered successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getStudentById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const student = await AdminService.getStudentById(id);
      return sendSuccess(res, student, 'Student details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updated = await AdminService.updateStudent(id, req.body);
      return sendSuccess(res, updated, 'Student updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateCourseStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body;
      const updated = await CoursesService.updateCourseStatus(
        id,
        status,
        req.user!.role,
        req.user?.teacherId,
        rejectionReason
      );
      return sendSuccess(res, updated, 'Course status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const gradeId = req.query.gradeId as string | undefined;
      const sessions = await SessionsService.listSessions(gradeId);
      return sendSuccess(res, sessions, 'Class sessions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async createSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { gradeId, title, description, sessionDate, sessionType } = req.body;
      const session = await SessionsService.createSession({
        gradeId,
        title,
        description,
        sessionDate,
        sessionType,
      });
      return sendCreated(res, session, 'Class session scheduled successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = (req.query.sessionId as string) || req.params.sessionId;
      if (!sessionId) {
        throw ApiError.badRequest('sessionId is required');
      }
      const data = await SessionsService.getSessionWithRoster(sessionId);
      return sendSuccess(res, data, 'Session roster retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async saveAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId, attendanceList, records } = req.body;
      const targetSessionId = sessionId || req.params.sessionId;
      const targetList = records || attendanceList;

      if (!targetSessionId || !Array.isArray(targetList)) {
        throw ApiError.badRequest('sessionId and attendance list array are required');
      }

      const result = await SessionsService.recordBatchAttendance(targetSessionId, targetList);
      return sendSuccess(res, result, 'Attendance marked successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getFees(req: Request, res: Response, next: NextFunction) {
    try {
      const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
      const month = req.query.month ? parseInt(req.query.month as string, 10) : new Date().getMonth() + 1;
      const gradeId = req.query.gradeId as string | undefined;

      const ledger = await FeesService.getMonthlyLedger(year, month, gradeId);
      return sendSuccess(res, ledger, 'Monthly fee ledger retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async recordFee(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId, gradeId, year, month, feeAmount, paidAmount, paymentMethod, note } = req.body;
      const record = await FeesService.recordPayment({
        studentId,
        gradeId,
        year: Number(year),
        month: Number(month),
        feeAmount: Number(feeAmount) || 0,
        paidAmount: Number(paidAmount) || 0,
        paymentMethod,
        note,
      });
      return sendSuccess(res, record, 'Fee payment recorded successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateFeeSetting(req: Request, res: Response, next: NextFunction) {
    try {
      const { gradeId, defaultMonthlyFee } = req.body;
      const targetGradeId = gradeId || req.params.gradeId;
      const updated = await FeesService.updateGradeFee(targetGradeId, Number(defaultMonthlyFee));
      return sendSuccess(res, updated, 'Grade fee setting updated successfully');
    } catch (error) {
      next(error);
    }
  }
}
