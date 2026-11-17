import { Router } from 'express';
import { EnrollmentsController } from './enrollments.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.post('/', authorize(Role.STUDENT), EnrollmentsController.enroll);
router.get('/my', authorize(Role.STUDENT), EnrollmentsController.getMyEnrollments);
router.get('/admin', authorize(Role.ADMIN), EnrollmentsController.listAll);
router.post('/progress/:lessonId', authorize(Role.STUDENT), EnrollmentsController.toggleProgress);
router.get('/learn/:slug', authorize(Role.STUDENT), EnrollmentsController.getCourseLearning);

export default router;
