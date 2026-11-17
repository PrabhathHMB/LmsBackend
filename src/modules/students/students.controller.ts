import { Request, Response, NextFunction } from 'express';
import { StudentsService } from './students.service';
import { sendSuccess } from '../../utils/response.utils';
import { ApiError } from '../../utils/api-error.utils';
import { Role } from '@prisma/client';

export class StudentsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const search = req.query.search as string;
      const gradeLevel = req.query.gradeLevel as string;

      const result = await StudentsService.listStudents({ page, limit, search, gradeLevel });
      sendSuccess(res, result.students, 'Students retrieved successfully', 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const student = await StudentsService.getStudentById(id);

      // Student can view their own, Teachers and Admins can view any
      if (
        req.user?.role === Role.STUDENT &&
        req.user?.studentId !== id &&
        req.user?.userId !== student.userId
      ) {
        throw ApiError.forbidden('Access denied');
      }

      sendSuccess(res, student, 'Student retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const student = await StudentsService.getStudentById(id);

      if (
        req.user?.role === Role.STUDENT &&
        req.user?.studentId !== id &&
        req.user?.userId !== student.userId
      ) {
        throw ApiError.forbidden('Access denied');
      }

      const updated = await StudentsService.updateStudent(id, req.body);
      sendSuccess(res, updated, 'Student profile updated successfully');
    } catch (error) {
      next(error);
    }
  }
}
