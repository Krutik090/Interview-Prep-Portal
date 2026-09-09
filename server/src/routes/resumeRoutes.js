import { Router } from 'express';
import * as resumeController from '../controllers/resumeController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { aiRateLimiter } from '../middlewares/rateLimiters.js';

const router = Router();

router.use(authenticate);
router.get('/eligibility', resumeController.getEligibility);
router.post('/generate', aiRateLimiter, resumeController.generate);
router.get('/status', resumeController.getStatus);
router.get('/download', resumeController.download);

export default router;
