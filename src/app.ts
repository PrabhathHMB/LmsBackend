import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';

import { ENV } from './config/env';
import { errorHandler } from './middlewares/error.middleware';
import { ApiError } from './utils/api-error.utils';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import studentsRoutes from './modules/students/students.routes';
import teachersRoutes from './modules/teachers/teachers.routes';
import categoriesRoutes from './modules/categories/categories.routes';
import coursesRoutes from './modules/courses/courses.routes';
import modulesRoutes from './modules/modules/modules.routes';
import lessonsRoutes from './modules/lessons/lessons.routes';
import enrollmentsRoutes from './modules/enrollments/enrollments.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import assignmentsRoutes from './modules/assignments/assignments.routes';
import submissionsRoutes from './modules/submissions/submissions.routes';
import quizzesRoutes from './modules/quizzes/quizzes.routes';
import resultsRoutes from './modules/results/results.routes';
import announcementsRoutes from './modules/announcements/announcements.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import reportsRoutes from './modules/reports/reports.routes';
import uploadsRoutes from './modules/uploads/uploads.routes';
import certificatesRoutes from './modules/certificates/certificates.routes';
import feesRoutes from './modules/fees/fees.routes';
import sessionsRoutes from './modules/sessions/sessions.routes';

const app: Application = express();

// Security & Core Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: [ENV.FRONTEND_URL, 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

if (ENV.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Serve uploaded static files
const uploadDirectory = path.resolve(process.cwd(), ENV.UPLOAD_DIR);
app.use('/uploads', express.static(uploadDirectory));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: ENV.NODE_ENV,
    version: '1.0.0',
  });
});

// API v1 Routes
const apiV1Router = express.Router();

apiV1Router.use('/auth', authRoutes);
apiV1Router.use('/users', usersRoutes);
apiV1Router.use('/students', studentsRoutes);
apiV1Router.use('/teachers', teachersRoutes);
apiV1Router.use('/categories', categoriesRoutes);
apiV1Router.use('/courses', coursesRoutes);
apiV1Router.use('/modules', modulesRoutes);
apiV1Router.use('/lessons', lessonsRoutes);
apiV1Router.use('/enrollments', enrollmentsRoutes);
apiV1Router.use('/attendance', attendanceRoutes);
apiV1Router.use('/assignments', assignmentsRoutes);
apiV1Router.use('/submissions', submissionsRoutes);
apiV1Router.use('/quizzes', quizzesRoutes);
apiV1Router.use('/results', resultsRoutes);
apiV1Router.use('/announcements', announcementsRoutes);
apiV1Router.use('/notifications', notificationsRoutes);
apiV1Router.use('/reports', reportsRoutes);
apiV1Router.use('/uploads', uploadsRoutes);
apiV1Router.use('/certificates', certificatesRoutes);
apiV1Router.use('/fees', feesRoutes);
apiV1Router.use('/sessions', sessionsRoutes);

app.use('/api/v1', apiV1Router);

// 404 Route Handler
app.use('*', (req: Request, res: Response, next: NextFunction) => {
  next(ApiError.notFound(`Endpoint ${req.originalUrl} not found on this server`));
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
