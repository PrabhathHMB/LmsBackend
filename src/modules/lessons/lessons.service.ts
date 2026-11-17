import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error.utils';

export class LessonsService {
  static async getLessonById(id: string, studentId?: string) {
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        module: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
        resources: true,
      },
    });

    if (!lesson) {
      throw ApiError.notFound('Lesson not found');
    }

    let progress = null;
    if (studentId) {
      progress = await prisma.lessonProgress.findUnique({
        where: {
          studentId_lessonId: {
            studentId,
            lessonId: id,
          },
        },
      });
    }

    return {
      ...lesson,
      isCompleted: progress?.isCompleted || false,
    };
  }

  static async createLesson(data: {
    moduleId: string;
    title: string;
    content?: string;
    videoUrl?: string;
    durationMinutes?: number;
    orderIndex?: number;
    isFreePreview?: boolean;
  }) {
    const module = await prisma.courseModule.findUnique({ where: { id: data.moduleId } });
    if (!module) {
      throw ApiError.notFound('Module not found');
    }

    let orderIndex = data.orderIndex;
    if (orderIndex === undefined) {
      const count = await prisma.lesson.count({ where: { moduleId: data.moduleId } });
      orderIndex = count;
    }

    return prisma.lesson.create({
      data: {
        moduleId: data.moduleId,
        title: data.title,
        content: data.content,
        videoUrl: data.videoUrl,
        durationMinutes: data.durationMinutes || 0,
        orderIndex,
        isFreePreview: data.isFreePreview || false,
      },
      include: {
        resources: true,
      },
    });
  }

  static async updateLesson(id: string, data: any) {
    const lesson = await prisma.lesson.findUnique({ where: { id } });
    if (!lesson) {
      throw ApiError.notFound('Lesson not found');
    }

    return prisma.lesson.update({
      where: { id },
      data,
      include: {
        resources: true,
      },
    });
  }

  static async deleteLesson(id: string) {
    const lesson = await prisma.lesson.findUnique({ where: { id } });
    if (!lesson) {
      throw ApiError.notFound('Lesson not found');
    }

    return prisma.lesson.delete({ where: { id } });
  }

  static async addResource(lessonId: string, data: {
    title: string;
    fileUrl: string;
    fileType: string;
    fileSize?: number;
  }) {
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) {
      throw ApiError.notFound('Lesson not found');
    }

    return prisma.lessonResource.create({
      data: {
        lessonId,
        title: data.title,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        fileSize: data.fileSize,
      },
    });
  }

  static async deleteResource(resourceId: string) {
    const resource = await prisma.lessonResource.findUnique({ where: { id: resourceId } });
    if (!resource) {
      throw ApiError.notFound('Resource not found');
    }

    return prisma.lessonResource.delete({ where: { id: resourceId } });
  }
}
