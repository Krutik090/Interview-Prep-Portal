import { TrainingProgram } from '../models/TrainingProgram.js';

export function create(data) {
  return TrainingProgram.create(data);
}

export function findById(id) {
  return TrainingProgram.findById(id);
}

export function updateById(id, update) {
  return TrainingProgram.findByIdAndUpdate(id, update, { new: true });
}

export function deleteById(id) {
  return TrainingProgram.findByIdAndDelete(id);
}

export function list({ roundType, status, page = 1, limit = 20 } = {}) {
  const filter = {};
  if (roundType) filter.roundType = roundType;
  if (status) filter.status = status;
  return TrainingProgram.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
}

export function addModuleToOrder(programId, moduleId) {
  return TrainingProgram.findByIdAndUpdate(
    programId,
    { $push: { moduleOrder: moduleId } },
    { new: true },
  );
}

export function removeModuleFromOrder(programId, moduleId) {
  return TrainingProgram.findByIdAndUpdate(
    programId,
    { $pull: { moduleOrder: moduleId } },
    { new: true },
  );
}

export function setModuleOrder(programId, moduleOrder) {
  return TrainingProgram.findByIdAndUpdate(programId, { moduleOrder }, { new: true });
}
