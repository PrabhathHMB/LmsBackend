import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error.utils';
import { TargetRole } from '@prisma/client';

export class AnnouncementsService {
  static async listAnnouncements(role?: string, courseId?: string) {
    const where: any = {};

    if (courseId) {
      where.courseId = courseId;
    } else {
      if (role === 'TEACHER') {
        where.targetRole = { in: [TargetRole.ALL, TargetRole.TEACHER] };
      } else if (role === 'STUDENT') {
        where.targetRole = { in: [TargetRole.ALL, TargetRole.STUDENT] };
      }
    }

    return prisma.announcement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { firstName: true, lastName: true, avatarUrl: true, role: true },
        },
        course: {
          select: { id: true, title: true },
        },
      },
    });
  }

  static async createAnnouncement(authorId: string, data: {
    title: string;
    content: string;
    targetRole?: TargetRole;
    courseId?: string;
  }) {
    return prisma.announcement.create({
      data: {
        authorId,
        title: data.title,
        content: data.content,
        targetRole: data.targetRole || TargetRole.ALL,
        courseId: data.courseId,
      },
      include: {
        author: { select: { firstName: true, lastName: true } },
      },
    });
  }

  static async deleteAnnouncement(id: string) {
    const announcement = await prisma.announcement.findUnique({ where: { id } });
    if (!announcement) {
      throw ApiError.notFound('Announcement not found');
    }

    return prisma.announcement.delete({ where: { id } });
  }
}
