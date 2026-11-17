import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error.utils';

export class AssignmentsService {
  static async listAssignments(courseId?: string) {
    const where: any = {};
    if (courseId) where.courseId = courseId;

    return prisma.assignment.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: {
        course: { select: { id: true, title: true, slug: true } },
        _count: {
          select: { submissions: true },
        },
      },
    });
  }

  static async getAssignmentById(id: string, studentId?: string) {
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        course: {
          select: { id: true, title: true, slug: true, teacherId: true },
        },
        submissions: {
          include: {
            student: {
              include: {
                user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      throw ApiError.notFound('Assignment not found');
    }

    let mySubmission = null;
    if (studentId) {
      mySubmission = assignment.submissions.find((s) => s.studentId === studentId) || null;
    }

    return {
      ...assignment,
      mySubmission,
    };
  }

  static async createAssignment(data: {
    courseId: string;
    title: string;
    description: string;
    maxScore?: number;
    dueDate: string;
    attachmentUrl?: string;
  }) {
    const course = await prisma.course.findUnique({ where: { id: data.courseId } });
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    return prisma.assignment.create({
      data: {
        courseId: data.courseId,
        title: data.title,
        description: data.description,
        maxScore: data.maxScore || 100,
        dueDate: new Date(data.dueDate),
        attachmentUrl: data.attachmentUrl,
      },
      include: {
        course: { select: { title: true } },
      },
    });
  }

  static async updateAssignment(id: string, data: any) {
    const assignment = await prisma.assignment.findUnique({ where: { id } });
    if (!assignment) {
      throw ApiError.notFound('Assignment not found');
    }

    const updateData: any = { ...data };
    if (data.dueDate) {
      updateData.dueDate = new Date(data.dueDate);
    }

    return prisma.assignment.update({
      where: { id },
      data: updateData,
    });
  }

  static async deleteAssignment(id: string) {
    const assignment = await prisma.assignment.findUnique({ where: { id } });
    if (!assignment) {
      throw ApiError.notFound('Assignment not found');
    }

    return prisma.assignment.delete({ where: { id } });
  }
}
