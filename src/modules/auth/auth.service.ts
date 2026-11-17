import { prisma } from '../../config/prisma';
import { hashPassword, comparePassword } from '../../utils/password.utils';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/token.utils';
import { ApiError } from '../../utils/api-error.utils';
import { Role } from '@prisma/client';

export class AuthService {
  static async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: Role;
    phone?: string;
    qualification?: string;
    specialization?: string;
    gradeLevel?: string;
  }) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw ApiError.conflict('An account with this email already exists');
    }

    const passwordHash = await hashPassword(data.password);
    const role = data.role || Role.STUDENT;

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role,
        phone: data.phone,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    // Create role-specific profiles
    let studentId: string | undefined;
    let teacherId: string | undefined;

    if (role === Role.STUDENT) {
      const student = await prisma.student.create({
        data: {
          userId: user.id,
          gradeLevel: data.gradeLevel,
          studentIdNumber: `STU-${Date.now().toString().slice(-6)}`,
        },
      });
      studentId = student.id;
    } else if (role === Role.TEACHER) {
      const teacher = await prisma.teacher.create({
        data: {
          userId: user.id,
          employeeId: `TCH-${Date.now().toString().slice(-6)}`,
          qualification: data.qualification,
          specialization: data.specialization,
        },
      });
      teacherId = teacher.id;
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      studentId,
      teacherId,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        studentProfile: true,
        teacherProfile: true,
      },
    });

    if (!user || !user.isActive) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      studentId: user.studentProfile?.id,
      teacherId: user.teacherProfile?.id,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        studentProfile: user.studentProfile,
        teacherProfile: user.teacherProfile,
      },
      accessToken,
      refreshToken,
    };
  }

  static async refreshToken(incomingRefreshToken: string) {
    if (!incomingRefreshToken) {
      throw ApiError.unauthorized('Refresh token is required');
    }

    let payload;
    try {
      payload = verifyRefreshToken(incomingRefreshToken);
    } catch (err) {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        studentProfile: true,
        teacherProfile: true,
      },
    });

    if (!user || !user.isActive || user.refreshToken !== incomingRefreshToken) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      studentId: user.studentProfile?.id,
      teacherId: user.teacherProfile?.id,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  static async logout(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return true;
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
        teacherProfile: true,
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const { passwordHash, refreshToken, ...userWithoutSecrets } = user;
    return userWithoutSecrets;
  }
}
