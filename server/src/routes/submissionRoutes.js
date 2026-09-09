import { Router } from 'express';
import * as submissionController from '../controllers/submissionController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { aiRateLimiter } from '../middlewares/rateLimiters.js';
import { createUploadMiddleware } from '../config/multerConfig.js';
import { verifyUploadedFileType } from '../middlewares/verifyUploadedFileType.js';
import {
  quizSubmitSchema,
  aiInterviewAnswerSchema,
  gdSubmitSchema,
  gdReviewSchema,
} from '../validators/submissionValidators.js';

const GD_FILE_MIME_TYPES = ['video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav'];
const uploadGdFile = createUploadMiddleware({
  subdir: 'gd-submissions',
  allowedMimeTypes: GD_FILE_MIME_TYPES,
  maxFileSizeMB: 50,
});

const router = Router();

router.use(authenticate);

router.post('/quiz/:moduleId', validate(quizSubmitSchema), submissionController.submitQuiz);

router.post('/ai-interview/:moduleId/start', aiRateLimiter, submissionController.startAiInterview);
router.get('/ai-interview/:submissionId', submissionController.getAiInterview);
router.post(
  '/ai-interview/:submissionId/answer',
  aiRateLimiter,
  validate(aiInterviewAnswerSchema),
  submissionController.answerAiInterview,
);

router.get('/gd/queue', requireRole('admin'), submissionController.listGdQueue);
router.post(
  '/gd/:moduleId',
  uploadGdFile.single('file'),
  verifyUploadedFileType(GD_FILE_MIME_TYPES),
  validate(gdSubmitSchema),
  submissionController.submitGd,
);
router.patch(
  '/gd/:submissionId/review',
  requireRole('admin'),
  validate(gdReviewSchema),
  submissionController.reviewGd,
);
router.post(
  '/gd/:submissionId/ai-assist-review',
  requireRole('admin'),
  aiRateLimiter,
  submissionController.requestGdAiAssist,
);

router.get('/:submissionId/performance-tips', submissionController.getPerformanceTips);

export default router;
