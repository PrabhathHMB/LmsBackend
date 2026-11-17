import { Router } from 'express';
import { AnnouncementsController } from './announcements.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', AnnouncementsController.list);
router.post('/', authorize(Role.ADMIN, Role.TEACHER), AnnouncementsController.create);
router.delete('/:id', authorize(Role.ADMIN, Role.TEACHER), AnnouncementsController.delete);

export default router;
