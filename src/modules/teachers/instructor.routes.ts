import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { Role, CourseStatus, CourseLevel } from '@prisma/client';
import { sendSuccess, sendCreated } from '../../utils/response.utils';
import { ApiError } from '../../utils/api-error.utils';
import { ModulesService } from '../modules/modules.service';
import { LessonsService } from '../lessons/lessons.service';
import { CoursesService } from '../courses/courses.service';

const router = Router();

router.use(authenticate, authorize(Role.ADMIN, Role.TEACHER));

/**
 * Helper to resolve teacher profile ID
 */
const getTeacherId = async (req: Request): Promise<string> => {
  if (req.user?.teacherId) return req.user.teacherId;
  const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.userId } });
  if (teacher) return teacher.id;
  // If admin has no teacher profile, create or find one
  const created = await prisma.teacher.create({
    data: {
      userId: req.user!.userId,
      employeeId: `TCH-${Date.now().toString().slice(-4)}`,
    },
  });
  return created.id;
};

// 1. List Instructor Courses & Stats
router.get('/courses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isTeacher = req.user?.role === Role.TEACHER;
    const teacherId = isTeacher ? await getTeacherId(req) : undefined;

    const where: any = {};
    if (teacherId) where.teacherId = teacherId;

    const courses = await prisma.course.findMany({
      where,
      include: {
        category: true,
        modules: {
          include: { lessons: true },
        },
        _count: {
          select: { enrollments: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const totalCourses = courses.length;
    const publishedCourses = courses.filter((c) => c.status === CourseStatus.PUBLISHED).length;
    const pendingReviewCourses = courses.filter((c) => c.status === CourseStatus.PENDING_REVIEW).length;
    const totalStudents = courses.reduce((acc, c) => acc + c._count.enrollments, 0);

    return sendSuccess(res, {
      courses,
      stats: {
        totalCourses,
        publishedCourses,
        pendingReviewCourses,
        totalStudents,
      },
    }, 'Instructor courses retrieved');
  } catch (error) {
    next(error);
  }
});

// 2. Get Course Curriculum Details
router.get('/courses/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        category: true,
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });

    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    return sendSuccess(res, course, 'Course curriculum retrieved');
  } catch (error) {
    next(error);
  }
});

// 3. Create Course
router.post('/courses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teacherId = await getTeacherId(req);
    const { title, description, shortDescription, categoryId, price, level, thumbnail } = req.body;

    const course = await CoursesService.createCourse({
      title,
      description: description || title,
      shortDescription,
      categoryId,
      price: Number(price) || 0,
      level: level as CourseLevel,
      thumbnail,
      teacherId,
    });

    return sendCreated(res, course, 'Course created successfully');
  } catch (error) {
    next(error);
  }
});

// 4. Update Course Metadata & Status
router.patch('/courses/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const teacherId = req.user?.role === Role.TEACHER ? await getTeacherId(req) : '';
    const updated = await CoursesService.updateCourse(id, teacherId, req.user!.role, req.body);
    return sendSuccess(res, updated, 'Course updated successfully');
  } catch (error) {
    next(error);
  }
});

// 5. Create Module
router.post('/courses/:id/modules', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: courseId } = req.params;
    const { title, description } = req.body;
    const module = await ModulesService.createModule({
      courseId,
      title,
      description,
    });
    return sendCreated(res, module, 'Module created successfully');
  } catch (error) {
    next(error);
  }
});

// 6. Create Lesson
router.post('/modules/:moduleId/lessons', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { moduleId } = req.params;
    const { title, description, content, youtubeUrl, videoUrl, durationMinutes, isPreview, isFreePreview } = req.body;

    const lesson = await LessonsService.createLesson({
      moduleId,
      title,
      content: content || description,
      videoUrl: videoUrl || youtubeUrl,
      durationMinutes: Number(durationMinutes) || 15,
      isFreePreview: isFreePreview !== undefined ? Boolean(isFreePreview) : Boolean(isPreview),
    });

    return sendCreated(res, lesson, 'Lesson added successfully');
  } catch (error) {
    next(error);
  }
});

// 7. Delete Lesson
router.delete('/lessons/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await LessonsService.deleteLesson(id);
    return sendSuccess(res, null, 'Lesson deleted successfully');
  } catch (error) {
    next(error);
  }
});

// 8. Delete Module
router.delete('/modules/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await ModulesService.deleteModule(id);
    return sendSuccess(res, null, 'Module deleted successfully');
  } catch (error) {
    next(error);
  }
});

export default router;
