import { Router } from 'express';
import { SubmissionsController } from './submissions.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.post('/assignment/:assignmentId', authorize(Role.STUDENT), SubmissionsController.submit);
router.patch('/:id/grade', authorize(Role.ADMIN, Role.TEACHER), SubmissionsController.grade);
router.get('/my', authorize(Role.STUDENT), SubmissionsController.getMySubmissions);

export default router;
