import * as moduleRepository from '../repositories/moduleRepository.js';
import * as trainingProgramRepository from '../repositories/trainingProgramRepository.js';
import * as aiService from './aiService.js';
import { ApiError } from '../utils/ApiError.js';

export async function create(programId, body) {
  const program = await trainingProgramRepository.findById(programId);
  if (!program) throw ApiError.notFound('Training program not found');

  const { type, ...data } = body;
  const module = await moduleRepository.createModule(type, { ...data, program: programId });
  await trainingProgramRepository.addModuleToOrder(programId, module._id);
  return module;
}

async function getExisting(moduleId) {
  const module = await moduleRepository.findById(moduleId);
  if (!module) throw ApiError.notFound('Module not found');
  return module;
}

export async function update(moduleId, body) {
  const existing = await getExisting(moduleId);
  if (body.type !== existing.type) {
    throw ApiError.badRequest(
      `Module type mismatch: this module is "${existing.type}", not "${body.type}"`,
    );
  }
  const { type: _type, ...data } = body;
  return moduleRepository.updateById(moduleId, data);
}

export async function remove(moduleId) {
  const existing = await getExisting(moduleId);
  await moduleRepository.deleteById(moduleId);
  await trainingProgramRepository.removeModuleFromOrder(existing.program, moduleId);
}

export async function listForProgram(programId, { includeUnpublished }) {
  return includeUnpublished
    ? moduleRepository.listByProgram(programId)
    : moduleRepository.listByProgramPublished(programId);
}

export async function getByIdForRole(moduleId, { role }) {
  const module = await getExisting(moduleId);
  if (role !== 'admin' && module.status !== 'published') {
    throw ApiError.notFound('Module not found');
  }
  return module;
}

export async function requestAiDraft(userId, moduleId, { contentType, topic, count }) {
  await getExisting(moduleId); // 404s if the module doesn't exist
  return aiService.generateContentDraft({ userId, contentType, topic, count });
}
