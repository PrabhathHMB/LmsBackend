import { Request, Response, NextFunction } from 'express';
import { ResultsService } from './results.service';
import { sendSuccess } from '../../utils/response.utils';
import { ApiError } from '../../utils/api-error.utils';
import { Role } from '@prisma/client';

export class ResultsController {
  static async getMyResults(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) {
        throw ApiError.forbidden('Only students have personal results');
      }

      const results = await ResultsService.getStudentResults(studentId);
      sendSuccess(res, results, 'Results fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getStudentResults(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId } = req.params;
      const results = await ResultsService.getStudentResults(studentId);
      sendSuccess(res, results, 'Results fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getCourseResults(req: Request, res: Response, next: NextFunction) {
    try {
      const { courseId } = req.params;
      const results = await ResultsService.getCourseResults(courseId);
      sendSuccess(res, results, 'Course results fetched successfully');
    } catch (error) {
      next(error);
    }
  }
}
