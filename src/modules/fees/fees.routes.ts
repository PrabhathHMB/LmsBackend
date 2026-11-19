import { Router } from 'express';
import { FeesController } from './fees.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Student route: view my fees
router.get('/my', authorize(Role.STUDENT), FeesController.getMyFees);

// Admin routes:
router.get('/ledger', authorize(Role.ADMIN), FeesController.getMonthlyLedger);
router.post('/record', authorize(Role.ADMIN), FeesController.recordPayment);
router.get('/student/:studentId', authorize(Role.ADMIN), FeesController.getStudentFeeHistory);
router.patch('/grade/:gradeId', authorize(Role.ADMIN), FeesController.updateGradeFee);

export default router;
