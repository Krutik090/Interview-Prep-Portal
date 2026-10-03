import { Router } from 'express';
import multer from 'multer';
import * as onboardingController from '../controllers/onboardingController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import { aiRateLimiter } from '../middlewares/rateLimiters.js';
import { onboardingSubmitSchema } from '../validators/onboardingValidators.js';
import { ApiError } from '../utils/ApiError.js';

// The resume is only read to suggest answers, never kept — so it's held in
// memory for the request and never written to disk.
const uploadResume = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(ApiError.badRequest('Upload your resume as a PDF file.'));
      return;
    }
    cb(null, true);
  },
});

const router = Router();

router.use(authenticate);
router.get('/questionnaire', onboardingController.getQuestionnaire);
router.post(
  '/parse-resume',
  aiRateLimiter,
  uploadResume.single('resume'),
  onboardingController.parseResume,
);
router.post('/submit', validate(onboardingSubmitSchema), onboardingController.submit);
router.get('/status', onboardingController.getStatus);

export default router;
