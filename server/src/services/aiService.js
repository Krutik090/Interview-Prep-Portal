import { z } from 'zod';
import { generateContent, isRateLimitError } from '../config/geminiClient.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import * as aiInteractionLogRepository from '../repositories/aiInteractionLogRepository.js';
import { PROMPT_VERSION as PROFILE_SUMMARY_VERSION, buildProfileSummaryPrompt } from '../prompts/profileSummary/v1.js';
import { PROMPT_VERSION as CONTENT_DRAFT_VERSION, buildContentDraftPrompt } from '../prompts/contentDraft/v1.js';
import {
  PROMPT_VERSION as INTERVIEW_QUESTION_GEN_VERSION,
  buildInterviewQuestionGenPrompt,
} from '../prompts/interviewQuestionGen/v1.js';
import {
  PROMPT_VERSION as INTERVIEW_EVALUATION_VERSION,
  buildInterviewEvaluationPrompt,
} from '../prompts/interviewEvaluation/v1.js';
import {
  PROMPT_VERSION as GD_REVIEW_ASSIST_VERSION,
  buildGdReviewAssistPrompt,
} from '../prompts/gdReviewAssist/v1.js';
import {
  PROMPT_VERSION as GROOMING_PERSONALIZE_VERSION,
  buildGroomingPersonalizePrompt,
} from '../prompts/groomingPersonalize/v1.js';

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

const interviewQuestionsResponseSchema = z.object({ questions: z.array(z.string().min(1)).min(1) });

/**
 * Generates fresh interview questions for one attempt. Deliberately never
 * cached (unlike catalog listings) — questions must be fresh per attempt to
 * prevent answer-sharing between students. Falls back to a small fixed
 * question bank so a Gemini outage never blocks starting an attempt.
 */
export async function generateMockInterviewQuestions({ userId, roundType, focusArea, difficulty, numQuestions }) {
  return withLogging({
    userId,
    operation: 'interview_question_gen',
    promptVersion: INTERVIEW_QUESTION_GEN_VERSION,
    fn: async () => {
      const prompt = buildInterviewQuestionGenPrompt({ roundType, focusArea, difficulty, numQuestions });
      const raw = await generateContent(prompt);
      const parsed = interviewQuestionsResponseSchema.safeParse(JSON.parse(extractJson(raw)));
      if (!parsed.success) {
        throw new Error(`Malformed Gemini response: ${parsed.error.message}`);
      }
      return parsed.data.questions;
    },
    fallback: () =>
      Array.from(
        { length: numQuestions },
        (_, i) => `Tell me about a time you handled a challenging ${roundType} situation. (fallback question ${i + 1})`,
      ),
  });
}

const interviewEvaluationResponseSchema = z.object({
  verdict: z.enum(['pass', 'fail']),
  score: z.number().min(0).max(100),
  feedback: z.string().min(1),
});

/**
 * Evaluates one free-text interview answer. Falls back to a neutral
 * "manual review required" verdict (rather than silently passing or
 * failing the student) if Gemini is unavailable.
 */
export async function evaluateInterviewAnswer({ userId, roundType, question, answerText }) {
  return withLogging({
    userId,
    operation: 'interview_evaluate',
    promptVersion: INTERVIEW_EVALUATION_VERSION,
    fn: async () => {
      const prompt = buildInterviewEvaluationPrompt({ roundType, question, answerText });
      const raw = await generateContent(prompt);
      const parsed = interviewEvaluationResponseSchema.safeParse(JSON.parse(extractJson(raw)));
      if (!parsed.success) {
        throw new Error(`Malformed Gemini response: ${parsed.error.message}`);
      }
      return { ...parsed.data, promptVersion: INTERVIEW_EVALUATION_VERSION, evaluatedAt: new Date() };
    },
    fallback: () => ({
      verdict: 'fail',
      score: 0,
      feedback: 'Automated evaluation unavailable — this answer needs manual review.',
      promptVersion: INTERVIEW_EVALUATION_VERSION,
      evaluatedAt: new Date(),
      needsManualReview: true,
    }),
  });
}

const gdReviewAssistResponseSchema = z.object({
  verdict: z.enum(['pass', 'fail']),
  comments: z.string().min(1),
});

/**
 * Drafts reviewer notes + a suggested verdict for a GD/video submission, for
 * the admin to edit before saving — never applied automatically.
 */
export async function assistReviewGdSubmission({ userId, prompt, response }) {
  return withLogging({
    userId,
    operation: 'gd_review_assist',
    promptVersion: GD_REVIEW_ASSIST_VERSION,
    fn: async () => {
      const builtPrompt = buildGdReviewAssistPrompt({ prompt, response });
      const raw = await generateContent(builtPrompt);
      const parsed = gdReviewAssistResponseSchema.safeParse(JSON.parse(extractJson(raw)));
      if (!parsed.success) {
        throw new Error(`Malformed Gemini response: ${parsed.error.message}`);
      }
      return parsed.data;
    },
    fallback: () => ({
      verdict: 'fail',
      comments: '(AI review draft unavailable — please review this submission manually.)',
    }),
  });
}

const groomingPersonalizeResponseSchema = z.object({ tip: z.string().min(1) });

/**
 * Personalizes a grooming article's advice to one student's profile. Result
 * is cached by the caller (groomingService) — this function itself just
 * makes the Gemini call + fallback.
 */
export async function generatePersonalizedGroomingTip({ userId, articleTitle, articleBody, profileSummary }) {
  return withLogging({
    userId,
    operation: 'grooming_personalize',
    promptVersion: GROOMING_PERSONALIZE_VERSION,
    fn: async () => {
      const prompt = buildGroomingPersonalizePrompt({ articleTitle, articleBody, profileSummary });
      const raw = await generateContent(prompt);
      const parsed = groomingPersonalizeResponseSchema.safeParse(JSON.parse(extractJson(raw)));
      if (!parsed.success) {
        throw new Error(`Malformed Gemini response: ${parsed.error.message}`);
      }
      return parsed.data.tip;
    },
    fallback: () => `Tip: apply "${articleTitle}" to your own interview prep — review it again before your next mock interview.`,
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
