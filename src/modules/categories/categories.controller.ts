import { Request, Response, NextFunction } from 'express';
import { CategoriesService } from './categories.service';
import { sendSuccess, sendCreated } from '../../utils/response.utils';

export class CategoriesController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await CategoriesService.listCategories();
      sendSuccess(res, categories, 'Categories fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const category = await CategoriesService.getCategoryBySlug(slug);
      sendSuccess(res, category, 'Category details fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await CategoriesService.createCategory(req.body);
      sendCreated(res, category, 'Category created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updated = await CategoriesService.updateCategory(id, req.body);
      sendSuccess(res, updated, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await CategoriesService.deleteCategory(id);
      sendSuccess(res, null, 'Category deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
