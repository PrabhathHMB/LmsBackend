import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error.utils';

export class ModulesService {
  static async createModule(data: {
    courseId: string;
    title: string;
    description?: string;
    orderIndex?: number;
  }) {
    const course = await prisma.course.findUnique({ where: { id: data.courseId } });
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    let orderIndex = data.orderIndex;
    if (orderIndex === undefined) {
      const count = await prisma.courseModule.count({ where: { courseId: data.courseId } });
      orderIndex = count;
    }

    return prisma.courseModule.create({
      data: {
        courseId: data.courseId,
        title: data.title,
        description: data.description,
        orderIndex,
      },
      include: {
        lessons: true,
      },
    });
  }

  static async updateModule(id: string, data: {
    title?: string;
    description?: string;
    orderIndex?: number;
  }) {
    const module = await prisma.courseModule.findUnique({ where: { id } });
    if (!module) {
      throw ApiError.notFound('Module not found');
    }

    return prisma.courseModule.update({
      where: { id },
      data,
    });
  }

  static async deleteModule(id: string) {
    const module = await prisma.courseModule.findUnique({ where: { id } });
    if (!module) {
      throw ApiError.notFound('Module not found');
    }

    return prisma.courseModule.delete({ where: { id } });
  }
}
