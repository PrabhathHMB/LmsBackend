import { Router } from 'express';
import { ResultsController } from './results.controller';
import { CertificatesController } from '../certificates/certificates.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Public certificate verification endpoint (alias to /api/v1/certificates/verify/:code)
router.get('/certificates/:code', CertificatesController.verify);

router.use(authenticate);

router.get('/my', authorize(Role.STUDENT), ResultsController.getMyResults);
router.get('/student/:studentId', authorize(Role.ADMIN, Role.TEACHER), ResultsController.getStudentResults);
router.get('/course/:courseId', authorize(Role.ADMIN, Role.TEACHER), ResultsController.getCourseResults);

export default router;
