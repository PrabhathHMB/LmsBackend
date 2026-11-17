import { Router } from 'express';
import { LessonsController } from './lessons.controller';
import { authenticate, optionalAuthenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.get('/:id', optionalAuthenticate, LessonsController.getById);

router.use(authenticate);
router.post('/', authorize(Role.ADMIN, Role.TEACHER), LessonsController.create);
router.patch('/:id', authorize(Role.ADMIN, Role.TEACHER), LessonsController.update);
router.delete('/:id', authorize(Role.ADMIN, Role.TEACHER), LessonsController.delete);

router.post('/:id/resources', authorize(Role.ADMIN, Role.TEACHER), LessonsController.addResource);
router.delete('/resources/:resourceId', authorize(Role.ADMIN, Role.TEACHER), LessonsController.deleteResource);

export default router;
