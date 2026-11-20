import { Router } from 'express';
import { StudentsController } from './students.controller';
import { UsersController } from '../users/users.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { createUserSchema } from '../users/users.schema';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', authorize(Role.ADMIN, Role.TEACHER), StudentsController.list);
router.post('/', authorize(Role.ADMIN, Role.TEACHER), validate(createUserSchema), UsersController.create);
router.get('/:id', StudentsController.getById);
router.patch('/:id', StudentsController.update);

export default router;
