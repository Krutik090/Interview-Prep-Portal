import { ModuleProgress } from '../models/ModuleProgress.js';

export function findOne(enrollmentId, moduleId) {
  return ModuleProgress.findOne({ enrollment: enrollmentId, module: moduleId });
}

// Upsert so the first interaction with a module (quiz submit, interview
// start, GD submit, mark-read) lazily creates its progress row instead of
// requiring every module to be pre-seeded at enrollment time (which would
// need re-syncing whenever an admin adds/removes modules after students
// have already enrolled).
export async function getOrCreate(enrollmentId, studentId, moduleId) {
  const existing = await findOne(enrollmentId, moduleId);
  if (existing) return existing;
  return ModuleProgress.create({ enrollment: enrollmentId, student: studentId, module: moduleId });
}

export function updateByEnrollmentAndModule(enrollmentId, moduleId, update) {
  return ModuleProgress.findOneAndUpdate(
    { enrollment: enrollmentId, module: moduleId },
    update,
    { new: true },
  );
}

export function listByEnrollment(enrollmentId) {
  return ModuleProgress.find({ enrollment: enrollmentId }).lean();
}
