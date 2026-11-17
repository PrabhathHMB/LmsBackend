import { Router } from 'express';
import { AssignmentsController } from './assignments.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', AssignmentsController.list);
router.get('/:id', AssignmentsController.getById);

router.post('/', authorize(Role.ADMIN, Role.TEACHER), AssignmentsController.create);
router.patch('/:id', authorize(Role.ADMIN, Role.TEACHER), AssignmentsController.update);
router.delete('/:id', authorize(Role.ADMIN, Role.TEACHER), AssignmentsController.delete);

export default router;
