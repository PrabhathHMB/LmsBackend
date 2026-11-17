import { Router } from 'express';
import { CoursesController } from './courses.controller';
import { authenticate, optionalAuthenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', CoursesController.list);
router.get('/id/:id', CoursesController.getById);
router.get('/:slug', optionalAuthenticate, CoursesController.getBySlug);

router.use(authenticate);

router.post('/', authorize(Role.ADMIN, Role.TEACHER), CoursesController.create);
router.patch('/:id', authorize(Role.ADMIN, Role.TEACHER), CoursesController.update);
router.delete('/:id', authorize(Role.ADMIN, Role.TEACHER), CoursesController.delete);

export default router;
