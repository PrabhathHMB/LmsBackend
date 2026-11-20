import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Base protection: Admin only (sessions and attendance allow teachers as well)
router.use(authenticate);

// Admin dashboard summary
router.get('/dashboard', authorize(Role.ADMIN), AdminController.getDashboard);

// Student management
router.get('/students', authorize(Role.ADMIN), AdminController.getStudents);
router.post('/students', authorize(Role.ADMIN), AdminController.createStudent);
router.get('/students/:id', authorize(Role.ADMIN), AdminController.getStudentById);
router.patch('/students/:id', authorize(Role.ADMIN), AdminController.updateStudent);

// Course status approval/rejection
router.patch('/courses/:id/status', authorize(Role.ADMIN), AdminController.updateCourseStatus);

// Sessions & Attendance (Admin and Teacher can access)
router.get('/sessions', authorize(Role.ADMIN, Role.TEACHER), AdminController.getSessions);
router.post('/sessions', authorize(Role.ADMIN, Role.TEACHER), AdminController.createSession);
router.get('/attendance', authorize(Role.ADMIN, Role.TEACHER), AdminController.getAttendance);
router.get('/attendance/:sessionId', authorize(Role.ADMIN, Role.TEACHER), AdminController.getAttendance);
router.post('/attendance', authorize(Role.ADMIN, Role.TEACHER), AdminController.saveAttendance);
router.post('/attendance/:sessionId', authorize(Role.ADMIN, Role.TEACHER), AdminController.saveAttendance);

// Fees management
router.get('/fees', authorize(Role.ADMIN), AdminController.getFees);
router.post('/fees', authorize(Role.ADMIN), AdminController.recordFee);
router.patch('/fees/settings', authorize(Role.ADMIN), AdminController.updateFeeSetting);

export default router;
