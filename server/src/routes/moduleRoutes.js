import { Router } from 'express';
import * as moduleController from '../controllers/moduleController.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { aiRateLimiter } from '../middlewares/rateLimiters.js';
import {
  createModuleSchema,
  updateModuleSchema,
  aiDraftRequestSchema,
} from '../validators/moduleValidators.js';

// mergeParams so :programId from the parent trainingRoutes mount is visible here.
const router = Router({ mergeParams: true });

router.get('/', moduleController.list);
router.post('/', requireRole('admin'), validate(createModuleSchema), moduleController.create);
router.get('/:moduleId', moduleController.getById);
router.patch(
  '/:moduleId',
  requireRole('admin'),
  validate(updateModuleSchema),
  moduleController.update,
);
router.delete('/:moduleId', requireRole('admin'), moduleController.remove);
router.post(
  '/:moduleId/ai-draft',
  requireRole('admin'),
  aiRateLimiter,
  validate(aiDraftRequestSchema),
  moduleController.requestAiDraft,
);

// Student progress endpoints (mark-read, submissions, etc.) depend on
// Enrollment/ModuleProgress and are added in Phase 3.

export default router;
