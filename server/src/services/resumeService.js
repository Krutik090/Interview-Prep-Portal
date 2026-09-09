import * as resumeRepository from '../repositories/resumeRepository.js';
import * as enrollmentRepository from '../repositories/enrollmentRepository.js';
import { getQueue, QUEUE_NAMES } from '../jobs/queues.js';
import { ApiError } from '../utils/ApiError.js';

export async function checkEligibility(studentId) {
  const enrollments = await enrollmentRepository.listByStudent(studentId);
  const passed = enrollments.filter((e) => e.status === 'passed');
  return {
    eligible: passed.length > 0,
    passedProgramTitles: passed.map((e) => e.program?.title).filter(Boolean),
  };
}

export async function requestGeneration(studentId) {
  // Never trust a client-side unlock flag — re-validate against the DB.
  const { eligible } = await checkEligibility(studentId);
  if (!eligible) {
    throw ApiError.forbidden('Complete and pass at least one training program before generating a resume');
  }

  const resume = await resumeRepository.upsertPending(studentId);
  await getQueue(QUEUE_NAMES.AI_RESUME).add('generate', { studentId: String(studentId) });
  return resume;
}

export async function getStatus(studentId) {
  const resume = await resumeRepository.findByStudent(studentId);
  if (!resume) throw ApiError.notFound('No resume has been generated yet');
  return resume;
}

export async function getForDownload(studentId) {
  const resume = await resumeRepository.findByStudent(studentId);
  // 404 rather than 403 on a missing/foreign resume — never confirm to a
  // student that some *other* student's resume exists at all.
  if (!resume || resume.status !== 'ready' || !resume.pdfPath) {
    throw ApiError.notFound('Resume not found');
  }
  return resume;
}
