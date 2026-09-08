import { Router } from 'express';
import * as profileController from '../controllers/profileController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { aiRateLimiter } from '../middlewares/rateLimiters.js';
import { profileUpdateSchema } from '../validators/profileValidators.js';
import { createUploadMiddleware } from '../config/multerConfig.js';

const uploadAvatar = createUploadMiddleware({
  subdir: 'avatars',
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
  maxFileSizeMB: 5,
});

const router = Router();

router.use(authenticate);
router.get('/me', profileController.getMyProfile);
router.patch('/me', validate(profileUpdateSchema), profileController.updateMyProfile);
router.post('/me/avatar', uploadAvatar.single('avatar'), profileController.uploadAvatar);
router.post('/me/refresh-ai-summary', aiRateLimiter, profileController.refreshAiSummary);
router.get('/:userId', requireRole('admin'), profileController.getProfileForAdmin);

export default router;
