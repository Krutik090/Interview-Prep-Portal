import { z } from 'zod';

export const quizSubmitSchema = z
  .object({
    answers: z
      .array(
        z
          .object({
            questionIndex: z.number().int().min(0),
            answerText: z.string().max(1000),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const aiInterviewAnswerSchema = z
  .object({
    answers: z.array(z.string().trim().max(3000)).min(1),
  })
  .strict();

// Whether `text` is actually required depends on the module's
// submissionMode ('text' vs 'file'), checked in submissionService against
// the DB — a file submission arrives via multipart form data, not this body.
export const gdSubmitSchema = z
  .object({
    text: z.string().trim().min(1).max(5000).optional(),
  })
  .strict();

export const gdReviewSchema = z
  .object({
    verdict: z.enum(['pass', 'fail']),
    comments: z.string().trim().min(1).max(2000),
  })
  .strict();
