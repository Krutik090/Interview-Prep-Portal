import * as moduleProgressRepository from '../repositories/moduleProgressRepository.js';
import * as enrollmentRepository from '../repositories/enrollmentRepository.js';
import * as moduleRepository from '../repositories/moduleRepository.js';
import * as trainingProgramRepository from '../repositories/trainingProgramRepository.js';

export function getOrCreateModuleProgress(enrollmentId, studentId, moduleId) {
  return moduleProgressRepository.getOrCreate(enrollmentId, studentId, moduleId);
}

/**
 * Records the outcome of one graded attempt at a module, then recalculates
 * the parent Enrollment's rollup (completedModules/overallScorePct/status)
 * from scratch against the program's *current* required+published modules —
 * so an admin adding/removing modules after students have enrolled is
 * reflected automatically rather than needing a migration.
 */
export async function recordModuleResult(enrollmentId, moduleId, { scorePct, submissionId }) {
  const enrollment = await enrollmentRepository.findById(enrollmentId);
  const program = await trainingProgramRepository.findById(enrollment.program);
  const minPerModuleScorePct = program.passCriteria?.minPerModuleScorePct ?? 0;
  const moduleStatus = scorePct >= minPerModuleScorePct ? 'completed' : 'failed';

  const progress = await moduleProgressRepository.getOrCreate(enrollmentId, enrollment.student, moduleId);
  await moduleProgressRepository.updateByEnrollmentAndModule(enrollmentId, moduleId, {
    status: moduleStatus,
    scorePct,
    attempts: progress.attempts + 1,
    lastAttemptSubmission: submissionId,
    completedAt: new Date(),
  });

  return recalculateEnrollmentRollup(enrollmentId);
}

async function recalculateEnrollmentRollup(enrollmentId) {
  const enrollment = await enrollmentRepository.findById(enrollmentId);
  const program = await trainingProgramRepository.findById(enrollment.program);
  const modules = (await moduleRepository.listByProgramPublished(enrollment.program)).filter(
    (m) => m.isRequired,
  );
  const progressRows = await moduleProgressRepository.listByEnrollment(enrollmentId);
  const progressByModule = new Map(progressRows.map((p) => [String(p.module), p]));

  const totalModules = modules.length;
  const attempted = modules
    .map((m) => progressByModule.get(String(m._id)))
    .filter((p) => p && ['completed', 'failed'].includes(p.status));
  const completedModules = attempted.length;

  const overallScorePct = attempted.length
    ? Math.round(attempted.reduce((sum, p) => sum + (p.scorePct ?? 0), 0) / attempted.length)
    : 0;

  let status = 'in_progress';
  let passedAt = enrollment.passedAt;
  if (totalModules > 0 && completedModules === totalModules) {
    const anyModuleFailed = attempted.some((p) => p.status === 'failed');
    const meetsOverall = overallScorePct >= (program.passCriteria?.minOverallScorePct ?? 70);
    const passed = meetsOverall && !anyModuleFailed;
    status = passed ? 'passed' : 'failed';
    passedAt = passed ? new Date() : null;
  }

  return enrollmentRepository.updateById(enrollmentId, {
    totalModules,
    completedModules,
    overallScorePct,
    status,
    passedAt,
  });
}
