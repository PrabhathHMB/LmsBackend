import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error.utils';
import { ResultType } from '@prisma/client';

export class QuizAttemptsService {
  static async startAttempt(quizId: string, studentId: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { course: true },
    });

    if (!quiz || !quiz.isPublished) {
      throw ApiError.badRequest('Quiz is not available');
    }

    // Verify enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId: quiz.courseId,
        },
      },
    });

    if (!enrollment || enrollment.status !== 'ACTIVE') {
      throw ApiError.forbidden('Must be enrolled in the course to attempt quiz');
    }

    return prisma.quizAttempt.create({
      data: {
        quizId,
        studentId,
        startedAt: new Date(),
      },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: { orderIndex: 'asc' },
              include: {
                options: {
                  orderBy: { orderIndex: 'asc' },
                  select: {
                    id: true,
                    text: true,
                    orderIndex: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  static async submitAttempt(attemptId: string, studentId: string, answers: Array<{
    questionId: string;
    selectedOptionId: string;
  }>) {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            questions: {
              include: { options: true },
            },
          },
        },
        student: {
          include: {
            user: { select: { id: true, firstName: true, email: true } },
          },
        },
      },
    });

    if (!attempt || attempt.studentId !== studentId) {
      throw ApiError.notFound('Quiz attempt not found');
    }

    if (attempt.completedAt) {
      throw ApiError.badRequest('This quiz attempt has already been submitted and graded');
    }

    // Automatic Grading Engine
    let totalScore = 0;
    let totalPointsPossible = 0;

    const answerRecords: any[] = [];

    for (const q of attempt.quiz.questions) {
      totalPointsPossible += q.points;
      const submitted = answers.find((a) => a.questionId === q.id);

      let isCorrect = false;
      let pointsAwarded = 0;

      if (submitted && submitted.selectedOptionId) {
        const selectedOpt = q.options.find((o) => o.id === submitted.selectedOptionId);
        if (selectedOpt && selectedOpt.isCorrect) {
          isCorrect = true;
          pointsAwarded = q.points;
        }
      }

      totalScore += pointsAwarded;

      answerRecords.push({
        attemptId,
        questionId: q.id,
        selectedOptionId: submitted?.selectedOptionId || null,
        isCorrect,
        pointsAwarded,
      });
    }

    const percentage = totalPointsPossible > 0 ? (totalScore / totalPointsPossible) * 100 : 0;
    const isPassed = percentage >= attempt.quiz.passingScore;

    let grade = 'F';
    if (percentage >= 85) grade = 'A';
    else if (percentage >= 70) grade = 'B';
    else if (percentage >= 55) grade = 'C';
    else if (percentage >= 40) grade = 'S';

    const [updatedAttempt] = await prisma.$transaction([
      prisma.quizAttempt.update({
        where: { id: attemptId },
        data: {
          score: totalScore,
          totalPoints: totalPointsPossible,
          isPassed,
          completedAt: new Date(),
          answers: {
            create: answerRecords.map((ar) => ({
              questionId: ar.questionId,
              selectedOptionId: ar.selectedOptionId,
              isCorrect: ar.isCorrect,
              pointsAwarded: ar.pointsAwarded,
            })),
          },
        },
        include: {
          answers: {
            include: {
              question: true,
              selectedOption: true,
            },
          },
        },
      }),
      prisma.result.create({
        data: {
          studentId,
          attemptId,
          title: `Quiz: ${attempt.quiz.title}`,
          type: ResultType.QUIZ,
          score: totalScore,
          maxScore: totalPointsPossible,
          grade,
          remarks: isPassed ? 'Passed' : 'Failed',
        },
      }),
      prisma.notification.create({
        data: {
          userId: attempt.student.user.id,
          title: 'Quiz Result Available',
          message: `You scored ${totalScore}/${totalPointsPossible} (${Math.round(percentage)}%) on "${attempt.quiz.title}". Status: ${isPassed ? 'PASSED' : 'FAILED'}.`,
          linkUrl: `/results`,
        },
      }),
    ]);

    return {
      ...updatedAttempt,
      percentage: Math.round(percentage),
      grade,
    };
  }

  static async getAttemptById(attemptId: string) {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: { select: { id: true, title: true, passingScore: true } },
        answers: {
          include: {
            question: {
              include: { options: true },
            },
            selectedOption: true,
          },
        },
      },
    });

    if (!attempt) {
      throw ApiError.notFound('Quiz attempt not found');
    }

    return attempt;
  }

  static async getStudentAttempts(studentId: string, quizId?: string) {
    const where: any = { studentId };
    if (quizId) where.quizId = quizId;

    return prisma.quizAttempt.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      include: {
        quiz: { select: { id: true, title: true, passingScore: true, course: { select: { title: true } } } },
      },
    });
  }
}
