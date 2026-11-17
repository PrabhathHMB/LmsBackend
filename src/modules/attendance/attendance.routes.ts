import { Router } from 'express';
import { AttendanceController } from './attendance.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.post('/record', authorize(Role.ADMIN, Role.TEACHER), AttendanceController.record);
router.get('/course/:courseId', authorize(Role.ADMIN, Role.TEACHER), AttendanceController.getCourseAttendance);
router.get('/my', authorize(Role.STUDENT), AttendanceController.getMyAttendance);

export default router;
