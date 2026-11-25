import { Request, Response, NextFunction } from 'express';
import { LessonsService } from './lessons.service';
import { sendSuccess, sendCreated } from '../../utils/response.utils';
import { ApiError } from '../../utils/api-error.utils';

export class LessonsController {
  static async getByGrade(req: Request, res: Response, next: NextFunction) {
    try {
      const { gradeSlug } = req.params;
      if (!req.user) {
        throw ApiError.unauthorized('Please log in to view lessons');
      }
      const data = await LessonsService.getLessonsByGrade(gradeSlug, req.user);
      sendSuccess(res, data, 'Grade lessons fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const lesson = await LessonsService.getLessonById(id, req.user?.studentId);
      sendSuccess(res, lesson, 'Lesson fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const lesson = await LessonsService.createLesson(req.body);
      sendCreated(res, lesson, 'Lesson created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updated = await LessonsService.updateLesson(id, req.body);
      sendSuccess(res, updated, 'Lesson updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await LessonsService.deleteLesson(id);
      sendSuccess(res, null, 'Lesson deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async addResource(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const resource = await LessonsService.addResource(id, req.body);
      sendCreated(res, resource, 'Resource attached successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteResource(req: Request, res: Response, next: NextFunction) {
    try {
      const { resourceId } = req.params;
      await LessonsService.deleteResource(resourceId);
      sendSuccess(res, null, 'Resource removed successfully');
    } catch (error) {
      next(error);
    }
  }
}
