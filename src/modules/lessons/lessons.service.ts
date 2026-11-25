import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error.utils';
import { Role } from '@prisma/client';

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

  static async getLessonsByGrade(gradeSlug: string, user: { userId: string; role: Role; studentId?: string }) {
    // 1. Verify category or course exists
    let category = await prisma.courseCategory.findUnique({
      where: { slug: gradeSlug },
    });

    let course: any = null;

    if (category) {
      course = await prisma.course.findFirst({
        where: { categoryId: category.id },
        include: {
          modules: {
            orderBy: { orderIndex: 'asc' },
            include: {
              lessons: {
                orderBy: { orderIndex: 'asc' },
                include: {
                  resources: true,
                },
              },
            },
          },
        },
      });
    } else {
      course = await prisma.course.findUnique({
        where: { slug: gradeSlug },
        include: {
          modules: {
            orderBy: { orderIndex: 'asc' },
            include: {
              lessons: {
                orderBy: { orderIndex: 'asc' },
                include: {
                  resources: true,
                },
              },
            },
          },
        },
      });

      if (course && course.categoryId) {
        category = await prisma.courseCategory.findUnique({
          where: { id: course.categoryId },
        });
      }
    }

    if (!category && !course) {
      throw ApiError.notFound('Grade category or course not found');
    }

    // 2. Authentication & Role validation
    if (user.role === Role.STUDENT && user.studentId) {
      const student = await prisma.student.findUnique({
        where: { id: user.studentId },
      });

      if (!student) {
        throw ApiError.forbidden('Student profile not found');
      }
    }

    if (!course) {
      return {
        category,
        course: null,
        lessons: [],
      };
    }

    // 4. Flatten and order lessons
    const rawLessons = course.modules.flatMap((m: any) =>
      m.lessons.map((l: any) => ({
        ...l,
        moduleTitle: m.title,
      }))
    );

    // 5. Fetch student progress if studentId is present
    const lessonIds = rawLessons.map((l: any) => l.id);
    const progressList = user.studentId && lessonIds.length > 0
      ? await prisma.lessonProgress.findMany({
          where: {
            studentId: user.studentId,
            lessonId: { in: lessonIds },
          },
        })
      : [];

    const progressMap = new Map(progressList.map((p) => [p.lessonId, p.isCompleted]));

    const lessons = rawLessons.map((l: any) => {
      let parsedContent: any = null;
      if (l.content) {
        try {
          parsedContent = JSON.parse(l.content);
        } catch {
          parsedContent = { notes: l.content };
        }
      }

      return {
        id: l.id,
        moduleId: l.moduleId,
        moduleTitle: l.moduleTitle,
        title: l.title,
        orderIndex: l.orderIndex,
        durationMinutes: l.durationMinutes,
        isFreePreview: l.isFreePreview,
        videoUrl: l.videoUrl,
        youtubeUrl: l.youtubeUrl,
        youtubeVideoId: l.youtubeVideoId,
        content: parsedContent,
        resources: l.resources,
        isCompleted: progressMap.get(l.id) || false,
      };
    });

    return {
      category,
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        thumbnail: course.thumbnail,
      },
      lessons,
    };
  }
}
