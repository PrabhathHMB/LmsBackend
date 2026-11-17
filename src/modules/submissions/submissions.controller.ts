import { Request, Response, NextFunction } from 'express';
import { SubmissionsService } from './submissions.service';
import { sendSuccess, sendCreated } from '../../utils/response.utils';
import { ApiError } from '../../utils/api-error.utils';

export class SubmissionsController {
  static async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) {
        throw ApiError.forbidden('Only students can submit assignments');
      }

      const { assignmentId } = req.params;
      const submission = await SubmissionsService.submitAssignment(studentId, assignmentId, req.body);
      sendCreated(res, submission, 'Assignment submitted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async grade(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const graded = await SubmissionsService.gradeSubmission(id, req.body);
      sendSuccess(res, graded, 'Submission graded successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getMySubmissions(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) {
        throw ApiError.forbidden('Only students have personal submissions');
      }

      const submissions = await SubmissionsService.getStudentSubmissions(studentId);
      sendSuccess(res, submissions, 'Submissions fetched successfully');
    } catch (error) {
      next(error);
    }
  }
}
