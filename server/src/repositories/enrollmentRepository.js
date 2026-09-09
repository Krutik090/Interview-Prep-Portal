import { Enrollment } from '../models/Enrollment.js';

export function create(data) {
  return Enrollment.create(data);
}

export function findByStudentAndProgram(studentId, programId) {
  return Enrollment.findOne({ student: studentId, program: programId });
}

export function findById(id) {
  return Enrollment.findById(id);
}

export function listByStudent(studentId) {
  return Enrollment.find({ student: studentId }).populate('program', 'title roundType status').lean();
}

export function listByProgram(programId) {
  return Enrollment.find({ program: programId }).populate('student', 'email').lean();
}

export function updateById(id, update) {
  return Enrollment.findByIdAndUpdate(id, update, { new: true });
}
