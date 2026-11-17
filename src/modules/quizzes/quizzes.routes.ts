import { Router } from 'express';
import { QuizzesController } from './quizzes.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Student attempt routes
router.post('/:id/attempts', authorize(Role.STUDENT), QuizzesController.startAttempt);
router.post('/attempts/:attemptId/submit', authorize(Role.STUDENT), QuizzesController.submitAttempt);
router.get('/attempts/my', authorize(Role.STUDENT), QuizzesController.getMyAttempts);
router.get('/attempts/:attemptId', QuizzesController.getAttempt);

// Quiz Management (Teacher / Admin)
router.get('/', QuizzesController.list);
router.get('/:id', QuizzesController.getById);
router.post('/', authorize(Role.ADMIN, Role.TEACHER), QuizzesController.create);
router.patch('/:id', authorize(Role.ADMIN, Role.TEACHER), QuizzesController.update);
router.delete('/:id', authorize(Role.ADMIN, Role.TEACHER), QuizzesController.delete);

router.post('/:id/questions', authorize(Role.ADMIN, Role.TEACHER), QuizzesController.addQuestion);
router.delete('/questions/:questionId', authorize(Role.ADMIN, Role.TEACHER), QuizzesController.deleteQuestion);

export default router;
