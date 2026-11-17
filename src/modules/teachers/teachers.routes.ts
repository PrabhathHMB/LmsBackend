import { Router } from 'express';
import { TeachersController } from './teachers.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', TeachersController.list);
router.get('/:id', TeachersController.getById);

router.use(authenticate);
router.patch('/:id', authorize(Role.ADMIN, Role.TEACHER), TeachersController.update);

export default router;
