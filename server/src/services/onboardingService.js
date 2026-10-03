import { fileTypeFromBuffer } from 'file-type';
import { extractText, getDocumentProxy } from 'unpdf';
import * as profileRepository from '../repositories/profileRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import * as aiService from './aiService.js';
import { getQueue, QUEUE_NAMES } from '../jobs/queues.js';
import { ApiError } from '../utils/ApiError.js';
import { ONBOARDING_QUESTIONNAIRE } from '../config/onboardingQuestionnaire.js';

// Enough for a several-page resume while bounding the prompt size/cost.
const MAX_RESUME_CHARS = 12_000;
// Below this, the PDF is almost certainly a scanned image with no text layer.
const MIN_RESUME_CHARS = 80;

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
    fullName: answers.fullName,
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

function clampText(value, max) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function clampTags(values) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  return values
    .map((v) => clampText(v, 60))
    .filter((v) => v && !seen.has(v.toLowerCase()) && seen.add(v.toLowerCase()))
    .slice(0, 30);
}

/**
 * Forces any prefill (AI or rule-based) into exactly the limits the submit
 * validator enforces, so a prefilled form can always be submitted as-is
 * once the student fills whatever is still blank.
 */
function normalizePrefill(raw = {}) {
  const year = Number(raw.education?.graduationYear);
  const thisYear = new Date().getFullYear();
  return {
    fullName: clampText(raw.fullName, 120),
    education: {
      degree: clampText(raw.education?.degree, 120),
      institution: clampText(raw.education?.institution, 200),
      branch: clampText(raw.education?.branch, 120),
      graduationYear: year >= 1950 && year <= thisYear + 10 ? year : undefined,
    },
    targetRole: clampText(raw.targetRole, 120),
    targetDomain: clampText(raw.targetDomain, 120),
    experienceLevel: ['fresher', '0-1yr', '1-3yr', '3+yr'].includes(raw.experienceLevel)
      ? raw.experienceLevel
      : undefined,
    currentSkills: clampTags(raw.currentSkills),
    strengths: clampTags(raw.strengths),
    preferredCompanies: clampTags(raw.preferredCompanies),
  };
}

/**
 * Reads an uploaded resume PDF and returns suggested onboarding answers.
 * Nothing is persisted — the file lives only in memory for this request,
 * and the result is a prefill the student reviews and can change.
 */
export async function parseResume(userId, fileBuffer) {
  const user = await userRepository.findById(userId);
  if (user.onboardingCompleted) {
    throw ApiError.conflict('Onboarding has already been completed');
  }

  // The declared mimetype is client-controlled; check the real bytes.
  const detected = await fileTypeFromBuffer(fileBuffer);
  if (detected?.mime !== 'application/pdf') {
    throw ApiError.badRequest('Upload your resume as a PDF file.');
  }

  let text;
  try {
    const pdf = await getDocumentProxy(new Uint8Array(fileBuffer));
    ({ text } = await extractText(pdf, { mergePages: true }));
  } catch {
    throw ApiError.badRequest('That PDF could not be read. Try exporting it again, or fill in your details manually.');
  }

  const cleaned = (text ?? '').trim();
  if (cleaned.length < MIN_RESUME_CHARS) {
    throw ApiError.badRequest(
      'No readable text was found in that PDF — it may be a scanned image. Fill in your details manually instead.',
    );
  }

  const { prefill, source } = await aiService.parseResumeToProfile({
    userId,
    resumeText: cleaned.slice(0, MAX_RESUME_CHARS),
  });

  return { prefill: normalizePrefill(prefill), source };
}
