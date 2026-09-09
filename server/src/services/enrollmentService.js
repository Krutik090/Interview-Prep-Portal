import * as enrollmentRepository from '../repositories/enrollmentRepository.js';
import * as trainingProgramRepository from '../repositories/trainingProgramRepository.js';
import * as moduleRepository from '../repositories/moduleRepository.js';
import * as moduleProgressRepository from '../repositories/moduleProgressRepository.js';
import { ApiError } from '../utils/ApiError.js';

export async function enroll(studentId, programId) {
  const program = await trainingProgramRepository.findById(programId);
  if (!program || program.status !== 'published') {
    throw ApiError.notFound('Training program not found');
  }

  const existing = await enrollmentRepository.findByStudentAndProgram(studentId, programId);
  if (existing) {
    throw ApiError.conflict('Already enrolled in this training program');
  }

  const requiredModules = (await moduleRepository.listByProgramPublished(programId)).filter(
    (m) => m.isRequired,
  );

  return enrollmentRepository.create({
    student: studentId,
    program: programId,
    totalModules: requiredModules.length,
  });
}

export async function listMine(studentId) {
  return enrollmentRepository.listByStudent(studentId);
}

export async function getDetail(enrollmentId, requester) {
  const enrollment = await enrollmentRepository.findById(enrollmentId);
  if (!enrollment) throw ApiError.notFound('Enrollment not found');
  if (requester.role !== 'admin' && String(enrollment.student) !== requester.id) {
    throw ApiError.forbidden('You do not have access to this enrollment');
  }
  const moduleProgress = await moduleProgressRepository.listByEnrollment(enrollmentId);
  return { enrollment, moduleProgress };
}

export async function listRoster(programId) {
  return enrollmentRepository.listByProgram(programId);
}

export async function getOwnedEnrollmentForModule(studentId, moduleId) {
  const module = await moduleRepository.findById(moduleId);
  if (!module) throw ApiError.notFound('Module not found');
  const enrollment = await enrollmentRepository.findByStudentAndProgram(studentId, module.program);
  if (!enrollment) {
    throw ApiError.forbidden('You must be enrolled in this training program first');
  }
  return { module, enrollment };
}
