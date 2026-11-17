import { Router } from 'express';
import { CategoriesController } from './categories.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', CategoriesController.list);
router.get('/:slug', CategoriesController.getBySlug);

router.use(authenticate);
router.post('/', authorize(Role.ADMIN), CategoriesController.create);
router.patch('/:id', authorize(Role.ADMIN), CategoriesController.update);
router.delete('/:id', authorize(Role.ADMIN), CategoriesController.delete);

export default router;
