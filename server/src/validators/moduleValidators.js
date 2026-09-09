import { z } from 'zod';
import { objectIdSchema } from './common.js';

const baseFields = {
  title: z.string().trim().min(1).max(200),
  instructions: z.string().max(5000).optional(),
  order: z.number().int().min(0).optional(),
  isRequired: z.boolean().optional(),
  maxScore: z.number().positive().optional(),
  status: z.enum(['draft', 'published']).optional(),
};

const quizQuestionSchema = z
  .object({
    questionText: z.string().trim().min(1).max(2000),
    type: z.enum(['mcq', 'short_answer']),
    options: z.array(z.string().trim().min(1).max(300)).max(10).optional(),
    correctAnswerIndex: z.number().int().min(0).optional(),
    correctAnswerText: z.string().trim().max(500).optional(),
    points: z.number().positive().default(1),
  })
  .strict();

const materialSchema = z
  .object({
    ...baseFields,
    type: z.literal('material'),
    contentBody: z.string().max(20000).optional(),
    videoUrl: z.string().url().optional(),
    followUpQuizId: objectIdSchema.optional(),
  })
  .strict();

const quizSchema = z
  .object({
    ...baseFields,
    type: z.literal('quiz'),
    questions: z.array(quizQuestionSchema).min(1).max(100),
    timeLimitMins: z.number().int().positive().optional(),
  })
  .strict();

const aiInterviewSchema = z
  .object({
    ...baseFields,
    type: z.literal('ai_interview'),
    focusArea: z.string().trim().max(120).optional(),
    numQuestions: z.number().int().min(1).max(20).optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  })
  .strict();

const gdSubmissionSchema = z
  .object({
    ...baseFields,
    type: z.literal('gd_submission'),
    prompt: z.string().trim().min(1).max(2000),
    submissionMode: z.enum(['text', 'file']).optional(),
    maxFileSizeMB: z.number().positive().max(200).optional(),
    allowedMimeTypes: z.array(z.string()).max(10).optional(),
    reviewMode: z.enum(['manual', 'ai_assist', 'both']).optional(),
  })
  .strict();

export const createModuleSchema = z.discriminatedUnion('type', [
  materialSchema,
  quizSchema,
  aiInterviewSchema,
  gdSubmissionSchema,
]);

// Updates must still declare `type`, matching the module's existing type
// (checked in moduleService against the DB) — keeps the update payload
// statically validated per-type instead of accepting an untyped bag of
// fields, while every field itself stays optional.
export const updateModuleSchema = z.discriminatedUnion('type', [
  materialSchema.partial({ title: true }),
  quizSchema.partial({ title: true, questions: true }),
  aiInterviewSchema.partial({ title: true }),
  gdSubmissionSchema.partial({ title: true, prompt: true }),
]);

export const aiDraftRequestSchema = z
  .object({
    contentType: z.enum(['quiz', 'material', 'grooming_tip']),
    topic: z.string().trim().min(1).max(200),
    count: z.number().int().min(1).max(20).optional(),
  })
  .strict();
