import { Router } from 'express';
import { SessionsController } from './sessions.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// List sessions - Admin and Teacher
router.get('/', authorize(Role.ADMIN, Role.TEACHER), SessionsController.list);

// Create session - Admin and Teacher
router.post('/', authorize(Role.ADMIN, Role.TEACHER), SessionsController.create);

// Get session with student roster
router.get('/:id', authorize(Role.ADMIN, Role.TEACHER), SessionsController.getById);

// Record batch attendance for session
router.post('/:id/attendance', authorize(Role.ADMIN, Role.TEACHER), SessionsController.recordAttendance);

export default router;
