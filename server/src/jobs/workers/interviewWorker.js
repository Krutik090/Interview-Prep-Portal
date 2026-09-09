import { Worker } from 'bullmq';
import { createRedisConnection } from '../../config/redis.js';
import { QUEUE_NAMES } from '../queues.js';
import { logger } from '../../utils/logger.js';
import * as submissionRepository from '../../repositories/submissionRepository.js';
import * as moduleRepository from '../../repositories/moduleRepository.js';
import * as trainingProgramRepository from '../../repositories/trainingProgramRepository.js';
import * as progressService from '../../services/progressService.js';
import { generateMockInterviewQuestions, evaluateInterviewAnswer } from '../../services/aiService.js';
import { PROMPT_VERSION as QUESTION_GEN_VERSION } from '../../prompts/interviewQuestionGen/v1.js';

export async function generateQuestions(submissionId) {
  const submission = await submissionRepository.findById(submissionId);
  if (!submission) {
    logger.warn({ submissionId }, 'interview generateQuestions: submission not found, skipping');
    return;
  }
  const module = await moduleRepository.findById(submission.module);
  const program = await trainingProgramRepository.findById(module.program);

  const questions = await generateMockInterviewQuestions({
    userId: submission.student,
    roundType: program.roundType,
    focusArea: module.focusArea,
    difficulty: module.difficulty,
    numQuestions: module.numQuestions,
  });

  submission.interviewQA = questions.map((question) => ({ question, answerText: null }));
  submission.interviewGenPromptVersion = QUESTION_GEN_VERSION;
  submission.questionsReady = true;
  await submission.save();
}

export async function evaluateAnswers(submissionId) {
  const submission = await submissionRepository.findById(submissionId);
  if (!submission) {
    logger.warn({ submissionId }, 'interview evaluateAnswers: submission not found, skipping');
    return;
  }
  const module = await moduleRepository.findById(submission.module);
  const program = await trainingProgramRepository.findById(module.program);

  for (const qa of submission.interviewQA) {
    // eslint-disable-next-line no-await-in-loop -- evaluations run sequentially per attempt, low volume
    const evaluation = await evaluateInterviewAnswer({
      userId: submission.student,
      roundType: program.roundType,
      question: qa.question,
      answerText: qa.answerText,
    });
    qa.aiEvaluation = evaluation;
  }

  const scores = submission.interviewQA.map((qa) => qa.aiEvaluation.score);
  const finalScorePct = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);

  submission.status = 'graded';
  submission.finalScorePct = finalScorePct;
  await submission.save();

  await progressService.recordModuleResult(submission.enrollment, submission.module, {
    scorePct: finalScorePct,
    submissionId: submission._id,
  });
}

export function startInterviewWorker() {
  const worker = new Worker(
    QUEUE_NAMES.AI_INTERVIEW,
    async (job) => {
      if (job.name === 'generateQuestions') return generateQuestions(job.data.submissionId);
      if (job.name === 'evaluateAnswers') return evaluateAnswers(job.data.submissionId);
      logger.warn({ jobName: job.name }, 'Unknown interview job name');
      return undefined;
    },
    { connection: createRedisConnection(), concurrency: 5 },
  );

  worker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id, jobName: job?.name }, 'interview job failed');
  });

  return worker;
}
