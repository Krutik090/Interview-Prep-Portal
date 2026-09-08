import path from 'node:path';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as profileService from '../services/profileService.js';

export const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await profileService.getByUserId(req.user.id);
  res.status(200).json({ profile });
});

export const updateMyProfile = asyncHandler(async (req, res) => {
  const profile = await profileService.updateMyProfile(req.user.id, req.body);
  res.status(200).json({ profile });
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('No file uploaded');
  }
  const relativePath = path.join('avatars', req.file.filename);
  const profile = await profileService.setAvatarPath(req.user.id, relativePath);
  res.status(200).json({ profile });
});

export const refreshAiSummary = asyncHandler(async (req, res) => {
  await profileService.refreshAiSummary(req.user.id);
  res.status(202).json({ message: 'AI summary refresh queued' });
});

export const getProfileForAdmin = asyncHandler(async (req, res) => {
  const profile = await profileService.getByUserId(req.params.userId);
  res.status(200).json({ profile });
});
