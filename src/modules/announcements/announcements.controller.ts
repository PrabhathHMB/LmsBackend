import { Request, Response, NextFunction } from 'express';
import { AnnouncementsService } from './announcements.service';
import { sendSuccess, sendCreated } from '../../utils/response.utils';
import { ApiError } from '../../utils/api-error.utils';

export class AnnouncementsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const courseId = req.query.courseId as string;
      const announcements = await AnnouncementsService.listAnnouncements(req.user?.role, courseId);
      sendSuccess(res, announcements, 'Announcements fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) {
        throw ApiError.unauthorized();
      }

      const announcement = await AnnouncementsService.createAnnouncement(req.user.userId, req.body);
      sendCreated(res, announcement, 'Announcement created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await AnnouncementsService.deleteAnnouncement(id);
      sendSuccess(res, null, 'Announcement deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
