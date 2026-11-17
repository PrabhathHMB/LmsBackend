import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from './attendance.service';
import { sendSuccess } from '../../utils/response.utils';
import { ApiError } from '../../utils/api-error.utils';

export class AttendanceController {
  static async record(req: Request, res: Response, next: NextFunction) {
    try {
      const records = await AttendanceService.recordAttendance(req.body);
      sendSuccess(res, records, 'Attendance recorded successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getCourseAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const { courseId } = req.params;
      const sessionDate = req.query.date as string;
      const attendance = await AttendanceService.getCourseAttendance(courseId, sessionDate);
      sendSuccess(res, attendance, 'Attendance fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getMyAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) {
        throw ApiError.forbidden('Only students have personal attendance records');
      }
      const courseId = req.query.courseId as string;
      const records = await AttendanceService.getStudentAttendance(studentId, courseId);
      sendSuccess(res, records, 'Attendance records fetched successfully');
    } catch (error) {
      next(error);
    }
  }
}
