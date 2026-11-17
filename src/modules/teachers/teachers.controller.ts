import { Request, Response, NextFunction } from 'express';
import { TeachersService } from './teachers.service';
import { sendSuccess } from '../../utils/response.utils';
import { ApiError } from '../../utils/api-error.utils';
import { Role } from '@prisma/client';

export class TeachersController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const search = req.query.search as string;

      const result = await TeachersService.listTeachers({ page, limit, search });
      sendSuccess(res, result.teachers, 'Teachers fetched successfully', 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const teacher = await TeachersService.getTeacherById(id);
      sendSuccess(res, teacher, 'Teacher details fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const teacher = await TeachersService.getTeacherById(id);

      if (
        req.user?.role !== Role.ADMIN &&
        req.user?.teacherId !== id &&
        req.user?.userId !== teacher.userId
      ) {
        throw ApiError.forbidden('Access denied');
      }

      const updated = await TeachersService.updateTeacher(id, req.body);
      sendSuccess(res, updated, 'Teacher profile updated successfully');
    } catch (error) {
      next(error);
    }
  }
}
