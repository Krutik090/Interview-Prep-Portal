import * as userRepository from '../repositories/userRepository.js';
import * as enrollmentRepository from '../repositories/enrollmentRepository.js';
import * as submissionRepository from '../repositories/submissionRepository.js';
import * as aiInteractionLogRepository from '../repositories/aiInteractionLogRepository.js';
import * as enrollmentService from './enrollmentService.js';

export function listStudents(params) {
  return userRepository.listStudents(params);
}

export function getStudentProgress(studentId) {
  return enrollmentService.listMine(studentId);
}

export async function getDashboardStats() {
  const [totalStudents, totalEnrollments, passedEnrollments, pendingGdReviews] = await Promise.all([
    userRepository.countStudents(),
    enrollmentRepository.countAll(),
    enrollmentRepository.countByStatus('passed'),
    submissionRepository.countGdPendingReview(),
  ]);

  return {
    totalStudents,
    totalEnrollments,
    passRate: totalEnrollments > 0 ? Math.round((passedEnrollments / totalEnrollments) * 100) : 0,
    pendingGdReviews,
  };
}

export async function getAiUsage() {
  const rows = await aiInteractionLogRepository.aggregateUsage();
  return rows.map((row) => ({
    operation: row._id.operation,
    status: row._id.status,
    count: row.count,
    avgLatencyMs: row.avgLatencyMs ? Math.round(row.avgLatencyMs) : null,
  }));
}
