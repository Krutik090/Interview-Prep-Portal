import * as profileRepository from '../repositories/profileRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import { getQueue, QUEUE_NAMES } from '../jobs/queues.js';
import { ApiError } from '../utils/ApiError.js';
import { ONBOARDING_QUESTIONNAIRE } from '../config/onboardingQuestionnaire.js';

export function getQuestionnaire() {
  return ONBOARDING_QUESTIONNAIRE;
}

export async function submit(userId, answers) {
  const user = await userRepository.findById(userId);
  if (user.onboardingCompleted) {
    throw ApiError.conflict('Onboarding has already been completed');
  }

  const profile = await profileRepository.create({
    user: userId,
    education: answers.education,
    targetRole: answers.targetRole,
    targetDomain: answers.targetDomain,
    experienceLevel: answers.experienceLevel,
    currentSkills: answers.currentSkills,
    strengths: answers.strengths,
    weaknesses: answers.weaknesses,
    preferredCompanies: answers.preferredCompanies,
    onboardingAnswersRaw: answers,
    ruleBasedProfile: { level: answers.experienceLevel, recommendedTrackIds: [] },
  });

  user.onboardingCompleted = true;
  await user.save();

  await getQueue(QUEUE_NAMES.AI_PROFILE).add('summarize', { userId: String(userId) });

  return profile;
}

export async function getStatus(userId) {
  const profile = await profileRepository.findByUser(userId);
  if (!profile) {
    return { onboardingCompleted: false, aiSummaryReady: false };
  }
  return {
    onboardingCompleted: true,
    aiSummaryReady: Boolean(profile.aiSummary?.generatedAt),
  };
}
