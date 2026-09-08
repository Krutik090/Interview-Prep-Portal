import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';

const SALT_ROUNDS = 12;

export function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// For high-entropy random tokens (refresh-token ids), not passwords — a fast
// deterministic digest is appropriate here, unlike bcrypt for user passwords.
export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}
