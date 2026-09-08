import { z } from 'zod';
import { generateContent, isRateLimitError } from '../config/geminiClient.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import * as aiInteractionLogRepository from '../repositories/aiInteractionLogRepository.js';
import { PROMPT_VERSION as PROFILE_SUMMARY_VERSION, buildProfileSummaryPrompt } from '../prompts/profileSummary/v1.js';
import { PROMPT_VERSION as CONTENT_DRAFT_VERSION, buildContentDraftPrompt } from '../prompts/contentDraft/v1.js';

const profileSummaryResponseSchema = z.object({
  summary: z.string().min(1),
  suggestedTracks: z.array(z.enum(['Aptitude', 'GD', 'Technical', 'HR'])).min(1),
});

function ruleBasedProfileSummary(onboardingAnswers) {
  const { targetRole, experienceLevel, currentSkills = [] } = onboardingAnswers;
  const summary =
    `${experienceLevel === 'fresher' ? 'A fresher' : `A candidate with ${experienceLevel} experience`} ` +
    `targeting ${targetRole || 'a role'}${currentSkills.length ? `, with skills in ${currentSkills.slice(0, 5).join(', ')}` : ''}.`;
  return {
    summary,
    suggestedTracks: ['Aptitude', 'Technical', 'HR', 'GD'],
  };
}

async function withLogging({ userId, operation, promptVersion, fn, fallback }) {
  const startedAt = Date.now();
  try {
    const result = await fn();
    await aiInteractionLogRepository
      .record({ userId, operation, promptVersion, status: 'success', latencyMs: Date.now() - startedAt })
      .catch((err) => logger.warn({ err }, 'Failed to write AiInteractionLog'));
    return result;
  } catch (err) {
    const status = isRateLimitError(err) ? 'rate_limited' : 'error';
    logger.warn({ err, operation }, 'AI call failed, using fallback');
    await aiInteractionLogRepository
      .record({ userId, operation, promptVersion, status, latencyMs: Date.now() - startedAt })
      .catch((logErr) => logger.warn({ err: logErr }, 'Failed to write AiInteractionLog'));
    return fallback();
  }
}

/**
 * Summarizes onboarding answers into a profile summary + suggested training
 * tracks. Never throws — falls back to a deterministic rule-based summary on
 * any Gemini failure, rate-limit, or malformed response.
 */
export async function summarizeProfile({ userId, onboardingAnswers }) {
  return withLogging({
    userId,
    operation: 'profile_summary',
    promptVersion: PROFILE_SUMMARY_VERSION,
    fn: async () => {
      const prompt = buildProfileSummaryPrompt(onboardingAnswers);
      const raw = await generateContent(prompt);
      const parsed = profileSummaryResponseSchema.safeParse(JSON.parse(extractJson(raw)));
      if (!parsed.success) {
        throw new Error(`Malformed Gemini response: ${parsed.error.message}`);
      }
      return {
        ...parsed.data,
        promptVersion: PROFILE_SUMMARY_VERSION,
        model: env.GEMINI_MODEL,
        generatedAt: new Date(),
      };
    },
    fallback: () => ({
      ...ruleBasedProfileSummary(onboardingAnswers),
      promptVersion: PROFILE_SUMMARY_VERSION,
      model: 'rule-based-fallback',
      generatedAt: new Date(),
    }),
  });
}

const quizDraftResponseSchema = z.object({
  questions: z.array(
    z.object({
      questionText: z.string().min(1),
      type: z.enum(['mcq', 'short_answer']),
      options: z.array(z.string()).optional(),
      correctAnswerIndex: z.number().optional(),
      correctAnswerText: z.string().optional(),
      points: z.number().default(1),
    }),
  ),
});
const materialDraftResponseSchema = z.object({ contentBody: z.string().min(1) });
const groomingDraftResponseSchema = z.object({ body: z.string().min(1) });

function contentDraftSchemaFor(contentType) {
  if (contentType === 'quiz') return quizDraftResponseSchema;
  if (contentType === 'material') return materialDraftResponseSchema;
  return groomingDraftResponseSchema;
}

function contentDraftFallback(contentType) {
  const notice = '(AI draft unavailable — please write this content manually.)';
  if (contentType === 'quiz') return { questions: [] };
  if (contentType === 'material') return { contentBody: notice };
  return { body: notice };
}

/**
 * Drafts admin-authored content (quiz questions / material body / grooming
 * tip text) for review — never auto-published. Falls back to an explicit
 * "unavailable" placeholder (rather than throwing) on any Gemini failure.
 */
export async function generateContentDraft({ userId, contentType, topic, count }) {
  return withLogging({
    userId,
    operation: 'content_draft',
    promptVersion: CONTENT_DRAFT_VERSION,
    fn: async () => {
      const prompt = buildContentDraftPrompt({ contentType, topic, count });
      const raw = await generateContent(prompt);
      const parsed = contentDraftSchemaFor(contentType).safeParse(JSON.parse(extractJson(raw)));
      if (!parsed.success) {
        throw new Error(`Malformed Gemini response: ${parsed.error.message}`);
      }
      return parsed.data;
    },
    fallback: () => contentDraftFallback(contentType),
  });
}

// Gemini occasionally wraps JSON in markdown fences despite instructions;
// strip those defensively before parsing.
function extractJson(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced ? fenced[1] : trimmed;
}

export { ruleBasedProfileSummary };
