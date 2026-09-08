import { Router } from 'express';
import * as onboardingController from '../controllers/onboardingController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import { onboardingSubmitSchema } from '../validators/onboardingValidators.js';

const router = Router();

router.use(authenticate);
router.get('/questionnaire', onboardingController.getQuestionnaire);
router.post('/submit', validate(onboardingSubmitSchema), onboardingController.submit);
router.get('/status', onboardingController.getStatus);

export default router;
