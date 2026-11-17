import { Router } from 'express';
import { ResultsController } from './results.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/my', authorize(Role.STUDENT), ResultsController.getMyResults);
router.get('/student/:studentId', authorize(Role.ADMIN, Role.TEACHER), ResultsController.getStudentResults);
router.get('/course/:courseId', authorize(Role.ADMIN, Role.TEACHER), ResultsController.getCourseResults);

export default router;
