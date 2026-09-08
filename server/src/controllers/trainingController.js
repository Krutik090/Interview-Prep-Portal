import { asyncHandler } from '../utils/asyncHandler.js';
import * as trainingService from '../services/trainingService.js';

export const create = asyncHandler(async (req, res) => {
  const program = await trainingService.create(req.user.id, req.body);
  res.status(201).json({ program });
});

export const getById = asyncHandler(async (req, res) => {
  const program = await trainingService.getById(req.params.programId, { role: req.user.role });
  res.status(200).json({ program });
});

export const update = asyncHandler(async (req, res) => {
  const program = await trainingService.update(req.params.programId, req.body);
  res.status(200).json({ program });
});

export const remove = asyncHandler(async (req, res) => {
  await trainingService.remove(req.params.programId);
  res.status(204).send();
});

export const setPublishStatus = asyncHandler(async (req, res) => {
  const program = await trainingService.setPublishStatus(req.params.programId, req.body.publish);
  res.status(200).json({ program });
});

export const reorderModules = asyncHandler(async (req, res) => {
  const program = await trainingService.reorderModules(req.params.programId, req.body.moduleOrder);
  res.status(200).json({ program });
});

export const list = asyncHandler(async (req, res) => {
  const { roundType, page, limit } = req.query;
  const pagination = { roundType, page: Number(page) || 1, limit: Number(limit) || 20 };

  const programs =
    req.user.role === 'admin'
      ? await trainingService.listForAdmin(pagination)
      : await trainingService.listPublishedForStudents(pagination);

  res.status(200).json({ programs });
});
