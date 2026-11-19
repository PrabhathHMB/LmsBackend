import { Router } from 'express';
import { CertificatesController } from './certificates.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Public verification route - accessible without login
router.get('/verify/:code', CertificatesController.verify);

// Protected routes
router.use(authenticate);

// Student route: view my certificates
router.get('/my', authorize(Role.STUDENT), CertificatesController.getMyCertificates);

// Admin/Teacher route: issue certificate
router.post('/issue', authorize(Role.ADMIN, Role.TEACHER), CertificatesController.issue);

// Admin route: list all certificates
router.get('/', authorize(Role.ADMIN), CertificatesController.getAll);

export default router;
