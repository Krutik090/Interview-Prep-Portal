import path from 'node:path';
import fs from 'node:fs';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';
import * as resumeService from '../services/resumeService.js';

export const getEligibility = asyncHandler(async (req, res) => {
  const result = await resumeService.checkEligibility(req.user.id);
  res.status(200).json(result);
});

export const generate = asyncHandler(async (req, res) => {
  const resume = await resumeService.requestGeneration(req.user.id);
  res.status(202).json({ resume });
});

export const getStatus = asyncHandler(async (req, res) => {
  const resume = await resumeService.getStatus(req.user.id);
  res.status(200).json({ resume });
});

export const download = asyncHandler(async (req, res) => {
  const resume = await resumeService.getForDownload(req.user.id);
  // pdfPath is stored relative to STORAGE_ROOT; resolve and stream it
  // directly rather than via any static file route, so this stays
  // authenticated and ownership-scoped to the requesting student.
  const absolutePath = path.join(process.cwd(), env.STORAGE_ROOT, resume.pdfPath);
  res.setHeader('Content-Disposition', 'attachment; filename="resume.pdf"');
  res.setHeader('Content-Type', 'application/pdf');
  fs.createReadStream(absolutePath).pipe(res);
});
