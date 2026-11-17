import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/dashboard', ReportsController.getStats);

export default router;
