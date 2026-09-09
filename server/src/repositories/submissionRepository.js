import { Submission } from '../models/Submission.js';

export function create(data) {
  return Submission.create(data);
}

export function findById(id) {
  return Submission.findById(id);
}

export function countPriorAttempts(studentId, moduleId) {
  return Submission.countDocuments({ student: studentId, module: moduleId });
}

export function updateById(id, update) {
  return Submission.findByIdAndUpdate(id, update, { new: true });
}

export function listGdReviewQueue() {
  return Submission.find({ type: 'gd_submission', status: 'under_review' })
    .populate('student', 'email')
    .sort({ submittedAt: 1 });
}
