import { asyncHandler } from '../utils/asyncHandler.js';
import * as groomingService from '../services/groomingService.js';

export const create = asyncHandler(async (req, res) => {
  const article = await groomingService.create(req.user.id, req.body);
  res.status(201).json({ article });
});

export const list = asyncHandler(async (req, res) => {
  const articles = await groomingService.list({ category: req.query.category, role: req.user.role });
  res.status(200).json({ articles });
});

export const getById = asyncHandler(async (req, res) => {
  const article = await groomingService.getById(req.params.id, { includeUnpublished: req.user.role === 'admin' });
  res.status(200).json({ article });
});

export const update = asyncHandler(async (req, res) => {
  const article = await groomingService.update(req.params.id, req.body);
  res.status(200).json({ article });
});

export const remove = asyncHandler(async (req, res) => {
  await groomingService.remove(req.params.id);
  res.status(204).send();
});

export const setPublishStatus = asyncHandler(async (req, res) => {
  const article = await groomingService.setPublishStatus(req.params.id, req.body.publish);
  res.status(200).json({ article });
});

export const requestAiDraft = asyncHandler(async (req, res) => {
  const draft = await groomingService.requestAiDraft(req.user.id, req.body);
  res.status(200).json({ draft });
});

export const getPersonalizedTip = asyncHandler(async (req, res) => {
  const result = await groomingService.getPersonalizedTip(req.user.id, req.params.id);
  res.status(200).json(result);
});
