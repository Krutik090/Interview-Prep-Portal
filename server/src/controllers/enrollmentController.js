import { asyncHandler } from '../utils/asyncHandler.js';
import * as enrollmentService from '../services/enrollmentService.js';

export const create = asyncHandler(async (req, res) => {
  const enrollment = await enrollmentService.enroll(req.user.id, req.body.programId);
  res.status(201).json({ enrollment });
});

export const listMine = asyncHandler(async (req, res) => {
  const enrollments = await enrollmentService.listMine(req.user.id);
  res.status(200).json({ enrollments });
});

export const getDetail = asyncHandler(async (req, res) => {
  const detail = await enrollmentService.getDetail(req.params.enrollmentId, req.user);
  res.status(200).json(detail);
});

export const listRoster = asyncHandler(async (req, res) => {
  const roster = await enrollmentService.listRoster(req.params.programId);
  res.status(200).json({ roster });
});
