import { Router } from 'express';
import * as groomingController from '../controllers/groomingController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { aiRateLimiter } from '../middlewares/rateLimiters.js';
import {
  createGroomingSchema,
  updateGroomingSchema,
  publishGroomingSchema,
  groomingAiDraftSchema,
  groomingListQuerySchema,
} from '../validators/groomingValidators.js';

const router = Router();

router.use(authenticate);

router.get('/', validate(groomingListQuerySchema, 'query'), groomingController.list);
router.post('/', requireRole('admin'), validate(createGroomingSchema), groomingController.create);
router.post(
  '/ai-draft',
  requireRole('admin'),
  aiRateLimiter,
  validate(groomingAiDraftSchema),
  groomingController.requestAiDraft,
);
router.get('/:id', groomingController.getById);
router.patch('/:id', requireRole('admin'), validate(updateGroomingSchema), groomingController.update);
router.delete('/:id', requireRole('admin'), groomingController.remove);
router.patch(
  '/:id/publish',
  requireRole('admin'),
  validate(publishGroomingSchema),
  groomingController.setPublishStatus,
);
router.get('/:id/personalized-tip', aiRateLimiter, groomingController.getPersonalizedTip);

export default router;
