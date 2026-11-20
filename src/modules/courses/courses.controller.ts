import { Request, Response, NextFunction } from 'express';
import { CoursesService } from './courses.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { prisma } from '../../config/prisma';
import { sendSuccess, sendCreated } from '../../utils/response.utils';
import { ApiError } from '../../utils/api-error.utils';
import { CourseLevel, CourseStatus } from '@prisma/client';

export class CoursesController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 12;
      const search = (req.query.search as string) || (req.query.q as string);
      const category = req.query.category as string;
      const categoryId = req.query.categoryId as string;
      const stream = req.query.stream as string;
      const price = req.query.price as string;
      const level = req.query.level as CourseLevel;
      const status = req.query.status as CourseStatus;
      const teacherId = req.query.teacherId as string;

      const result = await CoursesService.listCourses({
        page,
        limit,
        search,
        q: req.query.q as string,
        category,
        categoryId,
        stream,
        price,
        level,
        status,
        teacherId,
      });

      sendSuccess(res, result.courses, 'Courses fetched successfully', 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getHomePageData(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await CoursesService.getHomePageData();
      sendSuccess(res, data, 'Home page data fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await prisma.courseCategory.findMany({
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { courses: true, assignedStudents: true },
          },
        },
      });
      sendSuccess(res, categories, 'Categories fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getCourseLearnData(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const studentId = req.user?.studentId;
      if (!studentId) {
        throw ApiError.forbidden('Only enrolled students can access classroom content');
      }

      const data = await CoursesService.getCourseLearnData(id, studentId);
      sendSuccess(res, data, 'Classroom data fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async enroll(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      let studentId = req.user?.studentId;
      if (!studentId && req.user?.userId) {
        let student = await prisma.student.findUnique({ where: { userId: req.user.userId } });
        if (!student) {
          student = await prisma.student.create({ data: { userId: req.user.userId } });
        }
        studentId = student.id;
      }
      if (!studentId) {
        throw ApiError.forbidden('Student account required for enrollment');
      }

      const enrollment = await EnrollmentsService.enroll(studentId, id);
      sendCreated(res, enrollment, 'Enrolled in course successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const course = await CoursesService.getCourseBySlug(slug, req.user?.userId);
      sendSuccess(res, course, 'Course details fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const course = await CoursesService.getCourseById(id);
      sendSuccess(res, course, 'Course details fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.teacherId && req.user?.role !== 'ADMIN') {
        throw ApiError.forbidden('Only teachers and admins can create courses');
      }

      const teacherId = req.user.teacherId || req.body.teacherId;
      if (!teacherId) {
        throw ApiError.badRequest('Teacher ID is required');
      }

      const course = await CoursesService.createCourse({
        ...req.body,
        teacherId,
      });

      sendCreated(res, course, 'Course created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!req.user) throw ApiError.unauthorized();

      const updated = await CoursesService.updateCourse(
        id,
        req.user.teacherId || '',
        req.user.role,
        req.body
      );

      sendSuccess(res, updated, 'Course updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!req.user) throw ApiError.unauthorized();

      await CoursesService.deleteCourse(
        id,
        req.user.teacherId || '',
        req.user.role
      );

      sendSuccess(res, null, 'Course deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body;
      if (!req.user) throw ApiError.unauthorized();

      if (!status) {
        throw ApiError.badRequest('status is required');
      }

      const updated = await CoursesService.updateCourseStatus(
        id,
        status,
        req.user.role,
        req.user.teacherId,
        rejectionReason
      );

      sendSuccess(res, updated, 'Course status updated successfully');
    } catch (error) {
      next(error);
    }
  }
}
