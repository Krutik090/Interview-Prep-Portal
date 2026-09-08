import { asyncHandler } from '../utils/asyncHandler.js';
import * as onboardingService from '../services/onboardingService.js';

export const getQuestionnaire = asyncHandler(async (req, res) => {
  res.status(200).json(onboardingService.getQuestionnaire());
});

export const submit = asyncHandler(async (req, res) => {
  const profile = await onboardingService.submit(req.user.id, req.body);
  res.status(201).json({ profile });
});

export const getStatus = asyncHandler(async (req, res) => {
  const status = await onboardingService.getStatus(req.user.id);
  res.status(200).json(status);
});
