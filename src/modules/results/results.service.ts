import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error.utils';

export class ResultsService {
  static async getStudentResults(studentId: string) {
    return prisma.result.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      include: {
        attempt: {
          select: {
            quiz: { select: { id: true, title: true } },
          },
        },
      },
    });
  }

  static async getCourseResults(courseId: string) {
    return prisma.result.findMany({
      where: {
        attempt: {
          quiz: { courseId },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
  }
}
