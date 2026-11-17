import { Request, Response, NextFunction } from 'express';
import { QuizzesService } from './quizzes.service';
import { QuizAttemptsService } from './quiz-attempts.service';
import { sendSuccess, sendCreated } from '../../utils/response.utils';
import { ApiError } from '../../utils/api-error.utils';
import { Role } from '@prisma/client';

export class QuizzesController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const courseId = req.query.courseId as string;
      const quizzes = await QuizzesService.listQuizzes(courseId);
      sendSuccess(res, quizzes, 'Quizzes fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const isStudent = req.user?.role === Role.STUDENT;
      const quiz = await QuizzesService.getQuizById(id, isStudent);
      sendSuccess(res, quiz, 'Quiz details fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const quiz = await QuizzesService.createQuiz(req.body);
      sendCreated(res, quiz, 'Quiz created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updated = await QuizzesService.updateQuiz(id, req.body);
      sendSuccess(res, updated, 'Quiz updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await QuizzesService.deleteQuiz(id);
      sendSuccess(res, null, 'Quiz deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async addQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const question = await QuizzesService.addQuestion(id, req.body);
      sendCreated(res, question, 'Question added successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const { questionId } = req.params;
      await QuizzesService.deleteQuestion(questionId);
      sendSuccess(res, null, 'Question deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  // Quiz Attempts
  static async startAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) {
        throw ApiError.forbidden('Only students can attempt quizzes');
      }

      const { id } = req.params;
      const attempt = await QuizAttemptsService.startAttempt(id, studentId);
      sendCreated(res, attempt, 'Quiz attempt started');
    } catch (error) {
      next(error);
    }
  }

  static async submitAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) {
        throw ApiError.forbidden('Only students can submit quiz attempts');
      }

      const { attemptId } = req.params;
      const { answers } = req.body;
      const result = await QuizAttemptsService.submitAttempt(attemptId, studentId, answers);
      sendSuccess(res, result, 'Quiz submitted and graded successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      const { attemptId } = req.params;
      const attempt = await QuizAttemptsService.getAttemptById(attemptId);
      sendSuccess(res, attempt, 'Attempt retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getMyAttempts(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) {
        throw ApiError.forbidden('Only students have quiz attempts');
      }

      const quizId = req.query.quizId as string;
      const attempts = await QuizAttemptsService.getStudentAttempts(studentId, quizId);
      sendSuccess(res, attempts, 'Quiz attempts retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
