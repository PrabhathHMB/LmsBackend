import { Request, Response, NextFunction } from 'express';
import { ModulesService } from './modules.service';
import { sendSuccess, sendCreated } from '../../utils/response.utils';

export class ModulesController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const module = await ModulesService.createModule(req.body);
      sendCreated(res, module, 'Module created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updated = await ModulesService.updateModule(id, req.body);
      sendSuccess(res, updated, 'Module updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await ModulesService.deleteModule(id);
      sendSuccess(res, null, 'Module deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
