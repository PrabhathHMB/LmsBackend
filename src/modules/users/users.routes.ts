import { Router } from 'express';
import { UsersController } from './users.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { listUsersSchema, createUserSchema, updateUserSchema, resetPasswordSchema } from './users.schema';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', authorize(Role.ADMIN), validate(listUsersSchema), UsersController.list);
router.post('/', authorize(Role.ADMIN, Role.TEACHER), validate(createUserSchema), UsersController.create);
router.post('/:id/reset-password', authorize(Role.ADMIN, Role.TEACHER), validate(resetPasswordSchema), UsersController.resetPassword);
router.get('/:id', UsersController.getById);
router.patch('/:id', validate(updateUserSchema), UsersController.update);
router.delete('/:id', authorize(Role.ADMIN), UsersController.delete);

export default router;
