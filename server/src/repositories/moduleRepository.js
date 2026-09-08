import { Module } from '../models/Module.js';
import {
  MaterialModule,
  QuizModule,
  AiInterviewModule,
  GdSubmissionModule,
} from '../models/modules/index.js';

const DISCRIMINATOR_MODELS = {
  material: MaterialModule,
  quiz: QuizModule,
  ai_interview: AiInterviewModule,
  gd_submission: GdSubmissionModule,
};

export function createModule(type, data) {
  const DiscriminatorModel = DISCRIMINATOR_MODELS[type];
  return DiscriminatorModel.create({ ...data, type });
}

export function findById(id) {
  return Module.findById(id);
}

export function updateById(id, update) {
  return Module.findByIdAndUpdate(id, update, { new: true, runValidators: true });
}

export function deleteById(id) {
  return Module.findByIdAndDelete(id);
}

export function listByProgram(programId) {
  return Module.find({ program: programId }).sort({ order: 1 });
}

export function listByProgramPublished(programId) {
  return Module.find({ program: programId, status: 'published' }).sort({ order: 1 });
}
