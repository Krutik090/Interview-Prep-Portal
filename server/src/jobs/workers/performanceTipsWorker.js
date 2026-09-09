import { Worker } from 'bullmq';
import { createRedisConnection } from '../../config/redis.js';
import { QUEUE_NAMES } from '../queues.js';
import { logger } from '../../utils/logger.js';
import * as submissionRepository from '../../repositories/submissionRepository.js';
import * as moduleRepository from '../../repositories/moduleRepository.js';
import * as trainingProgramRepository from '../../repositories/trainingProgramRepository.js';
import { generatePerformanceTips } from '../../services/aiService.js';
import { PROMPT_VERSION } from '../../prompts/performanceTips/v1.js';

function summarizeAttempt(submission) {
  if (submission.type === 'quiz') {
    return submission.quizAnswers
      .map((a, i) => `Q${i + 1}: ${a.isCorrect ? 'correct' : 'incorrect'}`)
      .join('; ');
  }
  if (submission.type === 'ai_interview') {
    return submission.interviewQA
      .map((qa) => `Q: ${qa.question} — ${qa.aiEvaluation?.verdict ?? 'unscored'}`)
      .join('; ');
  }
  return submission.gdReview?.comments ?? 'No reviewer comments.';
}

async function generateTipsForSubmission(submissionId) {
  const submission = await submissionRepository.findById(submissionId);
  if (!submission || submission.finalScorePct == null) {
    logger.warn({ submissionId }, 'performance-tips job: submission not gradeable yet, skipping');
    return;
  }
  const module = await moduleRepository.findById(submission.module);
  const program = await trainingProgramRepository.findById(module.program);

  const tips = await generatePerformanceTips({
    userId: submission.student,
    moduleType: submission.type,
    roundType: program.roundType,
    scorePct: submission.finalScorePct,
    details: summarizeAttempt(submission),
  });

  await submissionRepository.updateById(submissionId, {
    performanceTips: { text: tips, generatedAt: new Date(), promptVersion: PROMPT_VERSION },
  });
}

export function startPerformanceTipsWorker() {
  const worker = new Worker(
    QUEUE_NAMES.AI_TIPS,
    async (job) => generateTipsForSubmission(job.data.submissionId),
    { connection: createRedisConnection(), concurrency: 5 },
  );

  worker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id }, 'performance-tips job failed');
  });

  return worker;
}

export { generateTipsForSubmission };
