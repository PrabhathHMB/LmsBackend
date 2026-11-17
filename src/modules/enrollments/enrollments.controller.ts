import { Request, Response, NextFunction } from 'express';
import { EnrollmentsService } from './enrollments.service';
import { sendSuccess, sendCreated } from '../../utils/response.utils';
import { ApiError } from '../../utils/api-error.utils';

export class EnrollmentsController {
  static async enroll(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) {
        throw ApiError.forbidden('Only students can enroll in courses');
      }

      const { courseId } = req.body;
      if (!courseId) {
        throw ApiError.badRequest('Course ID is required');
      }

      const enrollment = await EnrollmentsService.enroll(studentId, courseId);
      sendCreated(res, enrollment, 'Enrolled successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getMyEnrollments(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) {
        throw ApiError.forbidden('Only students have personal course enrollments');
      }

      const enrollments = await EnrollmentsService.getStudentEnrollments(studentId);
      sendSuccess(res, enrollments, 'Enrollments fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async listAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 15;
      const courseId = req.query.courseId as string;
      const studentId = req.query.studentId as string;

      const result = await EnrollmentsService.listAllEnrollments({ page, limit, courseId, studentId });
      sendSuccess(res, result.enrollments, 'All enrollments fetched successfully', 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async toggleProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) {
        throw ApiError.forbidden('Only students can track lesson progress');
      }

      const { lessonId } = req.params;
      const progress = await EnrollmentsService.toggleLessonProgress(studentId, lessonId);
      sendSuccess(res, progress, 'Lesson progress updated');
    } catch (error) {
      next(error);
    }
  }

  static async getCourseLearning(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) {
        throw ApiError.forbidden('Only students can view learning contents');
      }

      const { slug } = req.params;
      const data = await EnrollmentsService.getCourseLearningData(slug, studentId);
      sendSuccess(res, data, 'Learning data fetched successfully');
    } catch (error) {
      next(error);
    }
  }
}
