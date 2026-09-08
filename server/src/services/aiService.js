import { z } from 'zod';
import { generateContent, isRateLimitError } from '../config/geminiClient.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import * as aiInteractionLogRepository from '../repositories/aiInteractionLogRepository.js';
import { PROMPT_VERSION as PROFILE_SUMMARY_VERSION, buildProfileSummaryPrompt } from '../prompts/profileSummary/v1.js';

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

// Gemini occasionally wraps JSON in markdown fences despite instructions;
// strip those defensively before parsing.
function extractJson(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced ? fenced[1] : trimmed;
}

export { ruleBasedProfileSummary };
