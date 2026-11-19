import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error.utils';

export class CertificatesService {
  /**
   * Verify a certificate by its unique code (Public endpoint)
   */
  static async verifyCertificate(certificateCode: string) {
    const certificate = await prisma.certificate.findUnique({
      where: { certificateCode: certificateCode.trim().toUpperCase() },
      include: {
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        course: {
          include: {
            category: {
              select: {
                name: true,
              },
            },
            teacher: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!certificate) {
      throw ApiError.notFound('Certificate not found or verification code is invalid');
    }

    return certificate;
  }

  /**
   * Get all certificates earned by a specific student
   */
  static async getStudentCertificates(studentId: string) {
    return prisma.certificate.findMany({
      where: { studentId },
      orderBy: { issuedAt: 'desc' },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnail: true,
            teacher: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Issue a certificate manually (Admin / Teacher)
   */
  static async issueCertificate(studentId: string, courseId: string, grade = 'PASSED') {
    const existing = await prisma.certificate.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const certificateCode = `CERT-${course.slug.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}-${randomSuffix}`;

    const certificate = await prisma.certificate.create({
      data: {
        certificateCode,
        studentId,
        courseId,
        grade,
      },
      include: {
        course: { select: { title: true } },
      },
    });

    // Notify student
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { userId: true },
    });

    if (student) {
      await prisma.notification.create({
        data: {
          userId: student.userId,
          title: 'Certificate Awarded!',
          message: `Congratulations! You have received a certificate for completing "${course.title}".`,
          linkUrl: `/certificates/${certificateCode}`,
          type: 'SUCCESS',
        },
      });
    }

    return certificate;
  }

  /**
   * List all issued certificates (Admin)
   */
  static async getAllCertificates(params: { page?: number; limit?: number; search?: string }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.search) {
      where.OR = [
        { certificateCode: { contains: params.search } },
        { student: { user: { firstName: { contains: params.search } } } },
        { student: { user: { lastName: { contains: params.search } } } },
        { course: { title: { contains: params.search } } },
      ];
    }

    const [total, certificates] = await Promise.all([
      prisma.certificate.count({ where }),
      prisma.certificate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { issuedAt: 'desc' },
        include: {
          student: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      }),
    ]);

    return {
      certificates,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
