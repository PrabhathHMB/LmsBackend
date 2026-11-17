import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error.utils';
import { ResultType } from '@prisma/client';

export class QuizzesService {
  static async listQuizzes(courseId?: string) {
    const where: any = {};
    if (courseId) where.courseId = courseId;

    return prisma.quiz.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { id: true, title: true, slug: true } },
        _count: {
          select: { questions: true, attempts: true },
        },
      },
    });
  }

  static async getQuizById(id: string, isStudent = false) {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true, slug: true, teacherId: true } },
        questions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            options: {
              orderBy: { orderIndex: 'asc' },
              // For students taking a quiz, hide isCorrect
              select: {
                id: true,
                text: true,
                orderIndex: true,
                ...(isStudent ? {} : { isCorrect: true }),
              },
            },
          },
        },
      },
    });

    if (!quiz) {
      throw ApiError.notFound('Quiz not found');
    }

    return quiz;
  }

  static async createQuiz(data: {
    courseId: string;
    title: string;
    description?: string;
    timeLimitMinutes?: number;
    passingScore?: number;
    isPublished?: boolean;
    questions?: Array<{
      text: string;
      points?: number;
      options: Array<{
        text: string;
        isCorrect: boolean;
      }>;
    }>;
  }) {
    const course = await prisma.course.findUnique({ where: { id: data.courseId } });
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    return prisma.quiz.create({
      data: {
        courseId: data.courseId,
        title: data.title,
        description: data.description,
        timeLimitMinutes: data.timeLimitMinutes || 30,
        passingScore: data.passingScore || 50,
        isPublished: data.isPublished || false,
        questions: data.questions
          ? {
              create: data.questions.map((q, qIndex) => ({
                text: q.text,
                points: q.points || 1,
                orderIndex: qIndex,
                options: {
                  create: q.options.map((opt, optIndex) => ({
                    text: opt.text,
                    isCorrect: opt.isCorrect,
                    orderIndex: optIndex,
                  })),
                },
              })),
            }
          : undefined,
      },
      include: {
        questions: {
          include: { options: true },
        },
      },
    });
  }

  static async updateQuiz(id: string, data: any) {
    const quiz = await prisma.quiz.findUnique({ where: { id } });
    if (!quiz) {
      throw ApiError.notFound('Quiz not found');
    }

    return prisma.quiz.update({
      where: { id },
      data,
    });
  }

  static async deleteQuiz(id: string) {
    const quiz = await prisma.quiz.findUnique({ where: { id } });
    if (!quiz) {
      throw ApiError.notFound('Quiz not found');
    }

    return prisma.quiz.delete({ where: { id } });
  }

  static async addQuestion(quizId: string, data: {
    text: string;
    points?: number;
    options: Array<{
      text: string;
      isCorrect: boolean;
    }>;
  }) {
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      throw ApiError.notFound('Quiz not found');
    }

    const count = await prisma.question.count({ where: { quizId } });

    return prisma.question.create({
      data: {
        quizId,
        text: data.text,
        points: data.points || 1,
        orderIndex: count,
        options: {
          create: data.options.map((opt, i) => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
            orderIndex: i,
          })),
        },
      },
      include: {
        options: true,
      },
    });
  }

  static async deleteQuestion(questionId: string) {
    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) {
      throw ApiError.notFound('Question not found');
    }

    return prisma.question.delete({ where: { id: questionId } });
  }
}
