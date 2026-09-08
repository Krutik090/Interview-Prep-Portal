import * as profileRepository from '../repositories/profileRepository.js';
import { getQueue, QUEUE_NAMES } from '../jobs/queues.js';
import { ApiError } from '../utils/ApiError.js';

export async function getByUserId(userId) {
  const profile = await profileRepository.findByUser(userId);
  if (!profile) {
    throw ApiError.notFound('Profile not found — complete onboarding first');
  }
  return profile;
}

export async function updateMyProfile(userId, updates) {
  const profile = await profileRepository.updateByUser(userId, updates);
  if (!profile) {
    throw ApiError.notFound('Profile not found — complete onboarding first');
  }
  return profile;
}

export async function setAvatarPath(userId, avatarPath) {
  return profileRepository.updateByUser(userId, { avatarPath });
}

export async function refreshAiSummary(userId) {
  await getByUserId(userId); // 404s if no profile yet
  await getQueue(QUEUE_NAMES.AI_PROFILE).add('summarize', { userId: String(userId) });
}
