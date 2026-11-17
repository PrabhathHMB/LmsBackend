import { Router } from 'express';
import { StudentsController } from './students.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', authorize(Role.ADMIN, Role.TEACHER), StudentsController.list);
router.get('/:id', StudentsController.getById);
router.patch('/:id', StudentsController.update);

export default router;
