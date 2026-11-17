import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error.utils';
import { SubmissionStatus, ResultType } from '@prisma/client';

export class SubmissionsService {
  static async submitAssignment(studentId: string, assignmentId: string, data: {
    fileUrl?: string;
    content?: string;
  }) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { course: true },
    });

    if (!assignment) {
      throw ApiError.notFound('Assignment not found');
    }

    const isLate = new Date() > assignment.dueDate;
    const status = isLate ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED;

    const submission = await prisma.assignmentSubmission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId,
        },
      },
      update: {
        fileUrl: data.fileUrl,
        content: data.content,
        status,
        submittedAt: new Date(),
      },
      create: {
        assignmentId,
        studentId,
        fileUrl: data.fileUrl,
        content: data.content,
        status,
      },
      include: {
        assignment: { select: { title: true } },
      },
    });

    return submission;
  }

  static async gradeSubmission(submissionId: string, data: {
    score: number;
    feedback?: string;
  }) {
    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: true,
        student: {
          include: {
            user: { select: { id: true, firstName: true, email: true } },
          },
        },
      },
    });

    if (!submission) {
      throw ApiError.notFound('Submission not found');
    }

    if (data.score > submission.assignment.maxScore) {
      throw ApiError.badRequest(
        `Score cannot exceed maximum score of ${submission.assignment.maxScore}`
      );
    }

    const percentage = (data.score / submission.assignment.maxScore) * 100;
    let grade = 'F';
    if (percentage >= 85) grade = 'A';
    else if (percentage >= 70) grade = 'B';
    else if (percentage >= 55) grade = 'C';
    else if (percentage >= 40) grade = 'S';

    const [updatedSubmission] = await prisma.$transaction([
      prisma.assignmentSubmission.update({
        where: { id: submissionId },
        data: {
          score: data.score,
          feedback: data.feedback,
          status: SubmissionStatus.GRADED,
          gradedAt: new Date(),
        },
      }),
      prisma.result.create({
        data: {
          studentId: submission.studentId,
          title: `Assignment: ${submission.assignment.title}`,
          type: ResultType.ASSIGNMENT,
          score: data.score,
          maxScore: submission.assignment.maxScore,
          grade,
          remarks: data.feedback,
        },
      }),
      prisma.notification.create({
        data: {
          userId: submission.student.user.id,
          title: 'Assignment Graded',
          message: `Your submission for "${submission.assignment.title}" has been graded: ${data.score}/${submission.assignment.maxScore} (Grade: ${grade})`,
          linkUrl: `/assignments/${submission.assignmentId}`,
        },
      }),
    ]);

    return updatedSubmission;
  }

  static async getStudentSubmissions(studentId: string) {
    return prisma.assignmentSubmission.findMany({
      where: { studentId },
      orderBy: { submittedAt: 'desc' },
      include: {
        assignment: {
          include: {
            course: { select: { id: true, title: true, slug: true } },
          },
        },
      },
    });
  }
}
