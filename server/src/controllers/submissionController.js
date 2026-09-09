import path from 'node:path';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import * as submissionService from '../services/submissionService.js';

export const submitQuiz = asyncHandler(async (req, res) => {
  const submission = await submissionService.submitQuiz(req.user.id, req.params.moduleId, req.body.answers);
  res.status(201).json({ submission });
});

export const startAiInterview = asyncHandler(async (req, res) => {
  const submission = await submissionService.startAiInterview(req.user.id, req.params.moduleId);
  res.status(202).json({ submission });
});

export const getAiInterview = asyncHandler(async (req, res) => {
  const submission = await submissionService.getAiInterviewSubmission(
    req.user.id,
    req.user.role,
    req.params.submissionId,
  );
  res.status(200).json({ submission });
});

export const answerAiInterview = asyncHandler(async (req, res) => {
  const submission = await submissionService.answerAiInterview(
    req.user.id,
    req.params.submissionId,
    req.body.answers,
  );
  res.status(202).json({ submission });
});

export const submitGd = asyncHandler(async (req, res) => {
  if (!req.body.text && !req.file) {
    throw ApiError.badRequest('Provide either text or a file');
  }
  const filePath = req.file ? path.join('gd-submissions', req.file.filename) : undefined;
  const submission = await submissionService.submitGd(req.user.id, req.params.moduleId, {
    text: req.body.text,
    filePath,
  });
  res.status(201).json({ submission });
});

export const listGdQueue = asyncHandler(async (req, res) => {
  const submissions = await submissionService.listGdQueue();
  res.status(200).json({ submissions });
});

export const reviewGd = asyncHandler(async (req, res) => {
  const submission = await submissionService.reviewGd(req.user.id, req.params.submissionId, req.body);
  res.status(200).json({ submission });
});

export const requestGdAiAssist = asyncHandler(async (req, res) => {
  const draft = await submissionService.requestGdAiAssist(req.user.id, req.params.submissionId);
  res.status(200).json({ draft });
});

export const getPerformanceTips = asyncHandler(async (req, res) => {
  const result = await submissionService.getPerformanceTips(
    req.user.id,
    req.user.role,
    req.params.submissionId,
  );
  res.status(200).json(result);
});
