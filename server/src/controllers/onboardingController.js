import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as onboardingService from '../services/onboardingService.js';

export const getQuestionnaire = asyncHandler(async (req, res) => {
  res.status(200).json(onboardingService.getQuestionnaire());
});

export const submit = asyncHandler(async (req, res) => {
  const profile = await onboardingService.submit(req.user.id, req.body);
  res.status(201).json({ profile });
});

export const parseResume = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('Choose a PDF of your resume to upload.');
  }
  const result = await onboardingService.parseResume(req.user.id, req.file.buffer);
  res.status(200).json(result);
});

export const getStatus = asyncHandler(async (req, res) => {
  const status = await onboardingService.getStatus(req.user.id);
  res.status(200).json(status);
});
