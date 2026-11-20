import { Router } from 'express';
import { CoursesController } from './courses.controller';
import { authenticate, optionalAuthenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.get('/home', CoursesController.getHomePageData);
router.get('/categories', CoursesController.getCategories);
router.get('/', CoursesController.list);
router.get('/id/:id', CoursesController.getById);
router.get('/slug/:slug', optionalAuthenticate, CoursesController.getBySlug);
router.get('/:slug', optionalAuthenticate, CoursesController.getBySlug);

router.use(authenticate);

router.get('/:id/learn', CoursesController.getCourseLearnData);
router.post('/:id/enroll', CoursesController.enroll);

router.post('/', authorize(Role.ADMIN, Role.TEACHER), CoursesController.create);
router.patch('/:id', authorize(Role.ADMIN, Role.TEACHER), CoursesController.update);
router.patch('/:id/status', authorize(Role.ADMIN, Role.TEACHER), CoursesController.updateStatus);
router.delete('/:id', authorize(Role.ADMIN, Role.TEACHER), CoursesController.delete);

export default router;
