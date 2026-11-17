import { Router } from 'express';
import { NotificationsController } from './notifications.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', NotificationsController.list);
router.patch('/:id/read', NotificationsController.markRead);
router.patch('/read-all', NotificationsController.markAllRead);

export default router;
