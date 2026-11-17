import { Request, Response, NextFunction } from 'express';
import { NotificationsService } from './notifications.service';
import { sendSuccess } from '../../utils/response.utils';
import { ApiError } from '../../utils/api-error.utils';

export class NotificationsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) throw ApiError.unauthorized();
      const notifications = await NotificationsService.getUserNotifications(req.user.userId);
      sendSuccess(res, notifications, 'Notifications fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) throw ApiError.unauthorized();
      const { id } = req.params;
      const updated = await NotificationsService.markAsRead(id, req.user.userId);
      sendSuccess(res, updated, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }

  static async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) throw ApiError.unauthorized();
      await NotificationsService.markAllAsRead(req.user.userId);
      sendSuccess(res, null, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  }
}
