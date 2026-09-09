import { Resume } from '../models/Resume.js';

export function findByStudent(studentId) {
  return Resume.findOne({ student: studentId });
}

export async function upsertPending(studentId) {
  const existing = await findByStudent(studentId);
  if (existing) {
    existing.status = 'generating';
    existing.version += 1;
    await existing.save();
    return existing;
  }
  return Resume.create({ student: studentId, status: 'generating', version: 1 });
}

export function updateByStudent(studentId, update) {
  return Resume.findOneAndUpdate({ student: studentId }, update, { new: true });
}
