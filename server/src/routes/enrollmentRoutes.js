import { Router } from 'express';
import * as enrollmentController from '../controllers/enrollmentController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { enrollSchema } from '../validators/enrollmentValidators.js';

const router = Router();

router.use(authenticate);
router.post('/', validate(enrollSchema), enrollmentController.create);
router.get('/me', enrollmentController.listMine);
router.get('/:enrollmentId', enrollmentController.getDetail);
router.get('/program/:programId/roster', requireRole('admin'), enrollmentController.listRoster);

export default router;
