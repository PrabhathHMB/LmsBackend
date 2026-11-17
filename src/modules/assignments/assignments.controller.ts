import { Request, Response, NextFunction } from 'express';
import { AssignmentsService } from './assignments.service';
import { sendSuccess, sendCreated } from '../../utils/response.utils';

export class AssignmentsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const courseId = req.query.courseId as string;
      const assignments = await AssignmentsService.listAssignments(courseId);
      sendSuccess(res, assignments, 'Assignments fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const assignment = await AssignmentsService.getAssignmentById(id, req.user?.studentId);
      sendSuccess(res, assignment, 'Assignment fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const assignment = await AssignmentsService.createAssignment(req.body);
      sendCreated(res, assignment, 'Assignment created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updated = await AssignmentsService.updateAssignment(id, req.body);
      sendSuccess(res, updated, 'Assignment updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await AssignmentsService.deleteAssignment(id);
      sendSuccess(res, null, 'Assignment deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
