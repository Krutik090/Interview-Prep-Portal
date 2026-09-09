import { GroomingContent } from '../models/GroomingContent.js';

export function create(data) {
  return GroomingContent.create(data);
}

export function findById(id) {
  return GroomingContent.findById(id);
}

export function updateById(id, update) {
  return GroomingContent.findByIdAndUpdate(id, update, { new: true });
}

export function deleteById(id) {
  return GroomingContent.findByIdAndDelete(id);
}

export function list({ category, includeUnpublished } = {}) {
  const filter = {};
  if (category) filter.category = category;
  if (!includeUnpublished) filter.status = 'published';
  return GroomingContent.find(filter).sort({ createdAt: -1 }).lean();
}
