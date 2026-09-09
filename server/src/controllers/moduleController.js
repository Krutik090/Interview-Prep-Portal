import { asyncHandler } from '../utils/asyncHandler.js';
import * as moduleService from '../services/moduleService.js';
import * as submissionService from '../services/submissionService.js';

export const create = asyncHandler(async (req, res) => {
  const module = await moduleService.create(req.params.programId, req.body);
  res.status(201).json({ module });
});

export const list = asyncHandler(async (req, res) => {
  const modules = await moduleService.listForProgram(req.params.programId, {
    includeUnpublished: req.user.role === 'admin',
  });
  res.status(200).json({ modules });
});

export const getById = asyncHandler(async (req, res) => {
  const module = await moduleService.getByIdForRole(req.params.moduleId, { role: req.user.role });
  res.status(200).json({ module });
});

export const update = asyncHandler(async (req, res) => {
  const module = await moduleService.update(req.params.moduleId, req.body);
  res.status(200).json({ module });
});

export const remove = asyncHandler(async (req, res) => {
  await moduleService.remove(req.params.moduleId);
  res.status(204).send();
});

export const requestAiDraft = asyncHandler(async (req, res) => {
  const draft = await moduleService.requestAiDraft(req.user.id, req.params.moduleId, req.body);
  res.status(200).json({ draft });
});

export const markRead = asyncHandler(async (req, res) => {
  const enrollment = await submissionService.markMaterialRead(req.user.id, req.params.moduleId);
  res.status(200).json({ enrollment });
});
