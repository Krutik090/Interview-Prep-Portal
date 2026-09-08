import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import onboardingRoutes from './onboardingRoutes.js';
import profileRoutes from './profileRoutes.js';
import trainingRoutes from './trainingRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/profile', profileRoutes);
router.use('/trainings', trainingRoutes);

export default router;
