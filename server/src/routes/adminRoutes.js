import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { listStudentsQuerySchema } from '../validators/adminValidators.js';

const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/students', validate(listStudentsQuerySchema, 'query'), adminController.listStudents);
router.get('/students/:userId/progress', adminController.getStudentProgress);
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/ai-usage', adminController.getAiUsage);

export default router;
