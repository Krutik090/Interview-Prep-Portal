import { Router } from 'express';
import * as trainingController from '../controllers/trainingController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import {
  createTrainingProgramSchema,
  updateTrainingProgramSchema,
  publishStatusSchema,
  reorderModulesSchema,
  trainingListQuerySchema,
} from '../validators/trainingValidators.js';
import moduleRoutes from './moduleRoutes.js';

const router = Router();

router.use(authenticate);

router.get('/', validate(trainingListQuerySchema, 'query'), trainingController.list);
router.post(
  '/',
  requireRole('admin'),
  validate(createTrainingProgramSchema),
  trainingController.create,
);
router.get('/:programId', trainingController.getById);
router.patch(
  '/:programId',
  requireRole('admin'),
  validate(updateTrainingProgramSchema),
  trainingController.update,
);
router.delete('/:programId', requireRole('admin'), trainingController.remove);
router.patch(
  '/:programId/publish',
  requireRole('admin'),
  validate(publishStatusSchema),
  trainingController.setPublishStatus,
);
router.patch(
  '/:programId/modules/reorder',
  requireRole('admin'),
  validate(reorderModulesSchema),
  trainingController.reorderModules,
);

router.use('/:programId/modules', moduleRoutes);

export default router;
