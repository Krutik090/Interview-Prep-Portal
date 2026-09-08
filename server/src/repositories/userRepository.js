import { User } from '../models/User.js';

export function findByEmail(email) {
  return User.findOne({ email: email.toLowerCase() });
}

export function findByEmailWithSecrets(email) {
  return User.findOne({ email: email.toLowerCase() }).select(
    '+passwordHash +refreshTokenHash +refreshTokenVersion',
  );
}

export function findByIdWithSecrets(id) {
  return User.findById(id).select('+passwordHash +refreshTokenHash +refreshTokenVersion');
}

export function findById(id) {
  return User.findById(id);
}

export function create(data) {
  return User.create(data);
}

export function updateById(id, update) {
  return User.findByIdAndUpdate(id, update, { new: true });
}

export function listStudents({ page = 1, limit = 20, search } = {}) {
  const filter = { role: 'student' };
  if (search) {
    filter.email = { $regex: search, $options: 'i' };
  }
  return User.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
}
