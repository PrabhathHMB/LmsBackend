import { Request, Response, NextFunction } from 'express';
import { ReportsService } from './reports.service';
import { sendSuccess } from '../../utils/response.utils';
import { ApiError } from '../../utils/api-error.utils';
import { Role } from '@prisma/client';

export class ReportsController {
  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw ApiError.unauthorized();

      if (req.user.role === Role.ADMIN) {
        const stats = await ReportsService.getAdminStats();
        return sendSuccess(res, stats, 'Admin dashboard statistics');
      }

      if (req.user.role === Role.TEACHER) {
        if (!req.user.teacherId) throw ApiError.badRequest('Teacher profile missing');
        const stats = await ReportsService.getTeacherStats(req.user.teacherId);
        return sendSuccess(res, stats, 'Teacher dashboard statistics');
      }

      if (req.user.role === Role.STUDENT) {
        if (!req.user.studentId) throw ApiError.badRequest('Student profile missing');
        const stats = await ReportsService.getStudentStats(req.user.studentId);
        return sendSuccess(res, stats, 'Student dashboard statistics');
      }

      throw ApiError.forbidden();
    } catch (error) {
      next(error);
    }
  }
}
