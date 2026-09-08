import { Profile } from '../models/Profile.js';

export function findByUser(userId) {
  return Profile.findOne({ user: userId });
}

export function create(data) {
  return Profile.create(data);
}

export function updateByUser(userId, update) {
  return Profile.findOneAndUpdate({ user: userId }, update, { new: true });
}
