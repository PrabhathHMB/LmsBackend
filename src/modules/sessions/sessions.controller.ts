import { Request, Response, NextFunction } from 'express';
import { SessionsService } from './sessions.service';
import { sendSuccess, sendCreated } from '../../utils/response.utils';
import { ApiError } from '../../utils/api-error.utils';
import { SessionType } from '@prisma/client';

export class SessionsController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { gradeId, title, description, sessionDate, sessionType } = req.body;
      if (!gradeId || !title || !sessionDate) {
        throw ApiError.badRequest('gradeId, title, and sessionDate are required');
      }

      const session = await SessionsService.createSession({
        gradeId,
        title,
        description,
        sessionDate,
        sessionType: sessionType as SessionType,
      });

      return sendCreated(res, session, 'Class session scheduled successfully');
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const gradeId = req.query.gradeId as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const sessions = await SessionsService.listSessions(gradeId, startDate, endDate);
      return sendSuccess(res, sessions, 'Class sessions fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = await SessionsService.getSessionWithRoster(id);
      return sendSuccess(res, data, 'Session roster fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async recordAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { records } = req.body;

      if (!records || !Array.isArray(records)) {
        throw ApiError.badRequest('records array is required');
      }

      const result = await SessionsService.recordBatchAttendance(id, records);
      return sendSuccess(res, result, 'Batch attendance marked successfully');
    } catch (error) {
      next(error);
    }
  }
}
