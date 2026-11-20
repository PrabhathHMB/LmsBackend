import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import { sendSuccess, sendCreated } from '../../utils/response.utils';
import { ApiError } from '../../utils/api-error.utils';
import { Role } from '@prisma/client';

export class UsersController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await UsersService.listUsers(req.query as any);
      sendSuccess(res, result.users, 'Users fetched successfully', 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      // Allow Admin, Teacher (for their students), or the user themselves
      if (req.user?.role !== Role.ADMIN && req.user?.role !== Role.TEACHER && req.user?.userId !== id) {
        throw ApiError.forbidden('You can only access your own profile');
      }

      const user = await UsersService.getUserById(id);
      sendSuccess(res, user, 'User details fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required');
      }

      const user = await UsersService.createUser(req.body, req.user);
      sendCreated(res, user, 'User account created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updated = await UsersService.updateUser(id, req.body, req.user);
      sendSuccess(res, updated, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      await UsersService.resetPassword(id, newPassword, req.user);
      sendSuccess(res, null, 'User password has been reset successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (req.user?.userId === id) {
        throw ApiError.badRequest('You cannot delete your own account');
      }

      await UsersService.deleteUser(id);
      sendSuccess(res, null, 'User deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
