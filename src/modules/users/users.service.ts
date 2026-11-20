import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error.utils';
import { hashPassword } from '../../utils/password.utils';
import { Role } from '@prisma/client';
import { TokenPayload } from '../../utils/token.utils';

export class UsersService {
  static async listUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: Role;
    isActive?: boolean;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.role) {
      where.role = params.role;
    }

    if (typeof params.isActive === 'boolean') {
      where.isActive = params.isActive;
    }

    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search } },
        { lastName: { contains: params.search } },
        { email: { contains: params.search } },
        { phone: { contains: params.search } },
        { studentProfile: { studentIdNumber: { contains: params.search } } },
        { teacherProfile: { employeeId: { contains: params.search } } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phone: true,
          avatarUrl: true,
          isActive: true,
          createdAt: true,
          studentProfile: {
            select: {
              id: true,
              studentIdNumber: true,
              gradeLevel: true,
              studentPhone: true,
              parentPhone: true,
              address: true,
              _count: {
                select: {
                  enrollments: true,
                  submissions: true,
                },
              },
            },
          },
          teacherProfile: {
            select: {
              id: true,
              employeeId: true,
              qualification: true,
              specialization: true,
              _count: {
                select: {
                  courses: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        studentProfile: {
          include: {
            assignedGrade: true,
            enrollments: {
              include: {
                course: {
                  select: { id: true, title: true, slug: true },
                },
              },
            },
          },
        },
        teacherProfile: {
          include: {
            courses: {
              select: { id: true, title: true, slug: true, status: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const { passwordHash, refreshToken, ...sanitized } = user;
    return sanitized;
  }

  static async createUser(data: any, creator?: TokenPayload) {
    // Check if email already in use
    const normalizedEmail = data.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw ApiError.conflict('An account with this email already exists');
    }

    // Role governance
    let targetRole: Role = data.role || Role.STUDENT;

    if (creator?.role === Role.TEACHER) {
      // Teachers can ONLY create Students
      if (data.role && data.role !== Role.STUDENT) {
        throw ApiError.forbidden('Teachers are strictly authorized to create Student accounts only');
      }
      targetRole = Role.STUDENT;
    } else if (creator?.role !== Role.ADMIN) {
      throw ApiError.forbidden('Only Administrators and Teachers can create user accounts');
    }

    const passwordHash = await hashPassword(data.password);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create base User
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          role: targetRole,
          phone: data.phone || data.studentPhone || null,
          isActive: data.isActive !== undefined ? data.isActive : true,
        },
      });

      // 2. Role-specific profile creation
      if (targetRole === Role.STUDENT) {
        const studentIdNumber =
          data.studentIdNumber?.trim() ||
          `STU-${Math.floor(100000 + Math.random() * 900000)}`;

        const student = await tx.student.create({
          data: {
            userId: user.id,
            studentIdNumber,
            gradeLevel: data.gradeLevel || 'Grade 11',
            studentPhone: data.studentPhone || data.phone || null,
            parentPhone: data.parentPhone || null,
            address: data.address || null,
            assignedGradeId: data.assignedGradeId || null,
          },
        });

        // If teacher or admin specified a course, enroll student
        if (data.courseId) {
          if (creator?.role === Role.TEACHER) {
            // Verify course belongs to this teacher
            const course = await tx.course.findFirst({
              where: {
                id: data.courseId,
                teacherId: creator.teacherId,
              },
            });
            if (!course) {
              throw ApiError.forbidden('Instructors can only enroll students into their own assigned courses');
            }
          }

          await tx.enrollment.create({
            data: {
              studentId: student.id,
              courseId: data.courseId,
              status: 'ACTIVE',
              progressPercentage: 0,
            },
          });
        }
      } else if (targetRole === Role.TEACHER) {
        const employeeId =
          data.employeeId?.trim() ||
          `TCH-${Math.floor(100000 + Math.random() * 900000)}`;

        await tx.teacher.create({
          data: {
            userId: user.id,
            employeeId,
            qualification: data.qualification || null,
            specialization: data.specialization || null,
            bio: data.bio || null,
            headline: data.headline || null,
          },
        });
      }

      return user;
    });

    return this.getUserById(result.id);
  }

  static async updateUser(id: string, data: any, requester?: TokenPayload) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        studentProfile: true,
        teacherProfile: true,
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Role checks
    if (requester?.role === Role.TEACHER) {
      if (user.role !== Role.STUDENT || !user.studentProfile) {
        throw ApiError.forbidden('Teachers can only modify student records');
      }

      // Check if student is enrolled in teacher's course
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          studentId: user.studentProfile.id,
          course: { teacherId: requester.teacherId },
        },
      });

      if (!enrollment) {
        throw ApiError.forbidden('You can only modify students enrolled in your courses');
      }

      // Teacher cannot change role, email, active status, or password via generic update
      delete data.role;
      delete data.isActive;
      delete data.email;
      delete data.password;
    } else if (requester?.role !== Role.ADMIN && requester?.userId !== id) {
      throw ApiError.forbidden('You can only update your own profile');
    } else if (requester?.role !== Role.ADMIN) {
      delete data.role;
      delete data.isActive;
    }

    const {
      studentIdNumber,
      gradeLevel,
      studentPhone,
      parentPhone,
      address,
      assignedGradeId,
      employeeId,
      qualification,
      specialization,
      bio,
      ...userData
    } = data;

    await prisma.$transaction(async (tx) => {
      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id },
          data: userData,
        });
      }

      if (user.studentProfile && (studentIdNumber || gradeLevel || studentPhone || parentPhone || address || assignedGradeId !== undefined)) {
        await tx.student.update({
          where: { id: user.studentProfile.id },
          data: {
            ...(studentIdNumber && { studentIdNumber }),
            ...(gradeLevel && { gradeLevel }),
            ...(studentPhone && { studentPhone }),
            ...(parentPhone && { parentPhone }),
            ...(address !== undefined && { address }),
            ...(assignedGradeId !== undefined && { assignedGradeId }),
          },
        });
      }

      if (user.teacherProfile && (employeeId || qualification || specialization || bio)) {
        await tx.teacher.update({
          where: { id: user.teacherProfile.id },
          data: {
            ...(employeeId && { employeeId }),
            ...(qualification && { qualification }),
            ...(specialization && { specialization }),
            ...(bio !== undefined && { bio }),
          },
        });
      }
    });

    return this.getUserById(id);
  }

  static async resetPassword(userId: string, newPassword: string, requester?: TokenPayload) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Role checks
    if (requester?.role === Role.TEACHER) {
      if (user.role !== Role.STUDENT || !user.studentProfile) {
        throw ApiError.forbidden('Teachers can only reset passwords for students');
      }

      // Verify student is enrolled in teacher's course
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          studentId: user.studentProfile.id,
          course: { teacherId: requester.teacherId },
        },
      });

      if (!enrollment) {
        throw ApiError.forbidden('You can only reset passwords for students enrolled in your courses');
      }
    } else if (requester?.role !== Role.ADMIN) {
      throw ApiError.forbidden('Only Administrators and course Teachers can reset user passwords');
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        refreshToken: null, // invalidate active sessions
      },
    });

    return true;
  }

  static async deleteUser(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    await prisma.user.delete({ where: { id } });
    return true;
  }
}
