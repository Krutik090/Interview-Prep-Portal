import { asyncHandler } from '../utils/asyncHandler.js';
import * as adminService from '../services/adminService.js';

export const listStudents = asyncHandler(async (req, res) => {
  const students = await adminService.listStudents(req.query);
  res.status(200).json({ students });
});

export const getStudentProgress = asyncHandler(async (req, res) => {
  const enrollments = await adminService.getStudentProgress(req.params.userId);
  res.status(200).json({ enrollments });
});

export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getDashboardStats();
  res.status(200).json({ stats });
});

export const getAiUsage = asyncHandler(async (req, res) => {
  const usage = await adminService.getAiUsage();
  res.status(200).json({ usage });
});
