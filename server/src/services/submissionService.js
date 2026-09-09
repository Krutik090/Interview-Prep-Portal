import * as submissionRepository from '../repositories/submissionRepository.js';
import * as moduleRepository from '../repositories/moduleRepository.js';
import * as enrollmentService from './enrollmentService.js';
import * as progressService from './progressService.js';
import * as aiService from './aiService.js';
import { getQueue, QUEUE_NAMES } from '../jobs/queues.js';
import { gradeQuiz } from '../utils/scoreCalculator.js';
import { ApiError } from '../utils/ApiError.js';

function assertOwnership(submission, requesterId) {
  if (String(submission.student) !== String(requesterId)) {
    throw ApiError.forbidden('You do not have access to this submission');
  }
}

function assertModuleType(module, expectedType) {
  if (module.type !== expectedType) {
    throw ApiError.badRequest(`This module is not a ${expectedType} module`);
  }
  if (module.status !== 'published') {
    throw ApiError.notFound('Module not found');
  }
}

async function nextAttemptNumber(studentId, moduleId) {
  return (await submissionRepository.countPriorAttempts(studentId, moduleId)) + 1;
}

// --- Quiz (synchronous — pure computation, no external call) ---

export async function submitQuiz(studentId, moduleId, answers) {
  const { module, enrollment } = await enrollmentService.getOwnedEnrollmentForModule(studentId, moduleId);
  assertModuleType(module, 'quiz');

  const { graded, scorePct } = gradeQuiz(module.questions, answers);
  const submission = await submissionRepository.create({
    student: studentId,
    module: moduleId,
    enrollment: enrollment._id,
    type: 'quiz',
    attemptNumber: await nextAttemptNumber(studentId, moduleId),
    quizAnswers: graded,
    finalScorePct: scorePct,
    status: 'graded',
  });

  await progressService.recordModuleResult(enrollment._id, moduleId, {
    scorePct,
    submissionId: submission._id,
  });
  return submission;
}

// --- AI mock interview (async: question-gen, then async: evaluation) ---

export async function startAiInterview(studentId, moduleId) {
  const { module, enrollment } = await enrollmentService.getOwnedEnrollmentForModule(studentId, moduleId);
  assertModuleType(module, 'ai_interview');

  const submission = await submissionRepository.create({
    student: studentId,
    module: moduleId,
    enrollment: enrollment._id,
    type: 'ai_interview',
    attemptNumber: await nextAttemptNumber(studentId, moduleId),
    interviewQA: [],
    questionsReady: false,
    status: 'submitted',
  });

  await getQueue(QUEUE_NAMES.AI_INTERVIEW).add('generateQuestions', {
    submissionId: String(submission._id),
  });
  return submission;
}

export async function getAiInterviewSubmission(requesterId, requesterRole, submissionId) {
  const submission = await submissionRepository.findById(submissionId);
  if (!submission || submission.type !== 'ai_interview') {
    throw ApiError.notFound('Submission not found');
  }
  if (requesterRole !== 'admin') assertOwnership(submission, requesterId);
  return submission;
}

export async function answerAiInterview(studentId, submissionId, answers) {
  const submission = await submissionRepository.findById(submissionId);
  if (!submission || submission.type !== 'ai_interview') {
    throw ApiError.notFound('Submission not found');
  }
  assertOwnership(submission, studentId);
  if (!submission.questionsReady) {
    throw ApiError.badRequest('Interview questions are not ready yet');
  }
  if (submission.status !== 'submitted') {
    throw ApiError.conflict('This interview attempt has already been answered');
  }
  if (answers.length !== submission.interviewQA.length) {
    throw ApiError.badRequest(`Expected ${submission.interviewQA.length} answers`);
  }

  submission.interviewQA.forEach((qa, i) => {
    qa.answerText = answers[i];
  });
  submission.status = 'under_review';
  await submission.save();

  await getQueue(QUEUE_NAMES.AI_INTERVIEW).add('evaluateAnswers', {
    submissionId: String(submission._id),
  });
  return submission;
}

// --- GD / video submission (manual or AI-assisted review) ---

export async function submitGd(studentId, moduleId, { text, filePath }) {
  const { module, enrollment } = await enrollmentService.getOwnedEnrollmentForModule(studentId, moduleId);
  assertModuleType(module, 'gd_submission');

  if (module.submissionMode === 'file' && !filePath) {
    throw ApiError.badRequest('This module requires a file submission');
  }
  if (module.submissionMode === 'text' && !text) {
    throw ApiError.badRequest('This module requires a text submission');
  }

  return submissionRepository.create({
    student: studentId,
    module: moduleId,
    enrollment: enrollment._id,
    type: 'gd_submission',
    attemptNumber: await nextAttemptNumber(studentId, moduleId),
    gdTextResponse: text ?? null,
    gdFilePath: filePath ?? null,
    status: 'under_review',
    gdReview: { verdict: 'pending' },
  });
}

export async function listGdQueue() {
  return submissionRepository.listGdReviewQueue();
}

export async function reviewGd(adminId, submissionId, { verdict, comments }) {
  const submission = await submissionRepository.findById(submissionId);
  if (!submission || submission.type !== 'gd_submission') {
    throw ApiError.notFound('Submission not found');
  }

  const finalScorePct = verdict === 'pass' ? 100 : 0;
  const updated = await submissionRepository.updateById(submissionId, {
    gdReview: { reviewedBy: adminId, verdict, comments, reviewedAt: new Date() },
    finalScorePct,
    status: 'graded',
  });

  await progressService.recordModuleResult(submission.enrollment, submission.module, {
    scorePct: finalScorePct,
    submissionId: submission._id,
  });
  return updated;
}

export async function requestGdAiAssist(adminId, submissionId) {
  const submission = await submissionRepository.findById(submissionId);
  if (!submission || submission.type !== 'gd_submission') {
    throw ApiError.notFound('Submission not found');
  }
  const module = await moduleRepository.findById(submission.module);
  const draft = await aiService.assistReviewGdSubmission({
    userId: adminId,
    prompt: module?.prompt ?? '',
    response: submission.gdTextResponse ?? '(file submission — review the attached file manually)',
  });

  await submissionRepository.updateById(submissionId, {
    'gdReview.aiAssistDraft': draft.comments,
  });
  return draft;
}

// --- Material (mark-read; no Submission doc, just progress) ---

export async function markMaterialRead(studentId, moduleId) {
  const { module, enrollment } = await enrollmentService.getOwnedEnrollmentForModule(studentId, moduleId);
  assertModuleType(module, 'material');
  return progressService.recordModuleResult(enrollment._id, moduleId, {
    scorePct: 100,
    submissionId: null,
  });
}
