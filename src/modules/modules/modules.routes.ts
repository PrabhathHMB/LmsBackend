import { Router } from 'express';
import { ModulesController } from './modules.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.post('/', authorize(Role.ADMIN, Role.TEACHER), ModulesController.create);
router.patch('/:id', authorize(Role.ADMIN, Role.TEACHER), ModulesController.update);
router.delete('/:id', authorize(Role.ADMIN, Role.TEACHER), ModulesController.delete);

export default router;
