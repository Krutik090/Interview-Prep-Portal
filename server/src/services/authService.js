import * as userRepository from '../repositories/userRepository.js';
import { hashPassword, comparePassword, sha256 } from '../utils/hashUtils.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  newRefreshTokenId,
} from '../utils/tokenUtils.js';
import { ApiError } from '../utils/ApiError.js';

function toPublicUser(user) {
  return {
    id: String(user._id),
    email: user.email,
    role: user.role,
    onboardingCompleted: user.onboardingCompleted,
  };
}

async function issueTokenPair(user) {
  const jti = newRefreshTokenId();
  const version = user.refreshTokenVersion ?? 0;
  await userRepository.updateById(user._id, { refreshTokenHash: sha256(jti) });

  return {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user, jti, version),
  };
}

export async function register({ email, password }) {
  const existing = await userRepository.findByEmail(email);
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const passwordHash = await hashPassword(password);
  const user = await userRepository.create({ email, passwordHash, role: 'student' });
  const tokens = await issueTokenPair(user);

  return { user: toPublicUser(user), ...tokens };
}

export async function login({ email, password }) {
  const user = await userRepository.findByEmailWithSecrets(email);
  if (!user || user.status !== 'active') {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = await issueTokenPair(user);
  return { user: toPublicUser(user), ...tokens };
}

export async function refresh(refreshTokenValue) {
  if (!refreshTokenValue) {
    throw ApiError.unauthorized('Missing refresh token');
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshTokenValue);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await userRepository.findByIdWithSecrets(payload.sub);
  if (!user || user.status !== 'active') {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  if (payload.ver !== user.refreshTokenVersion) {
    throw ApiError.unauthorized('Session has been invalidated, please log in again');
  }

  if (!user.refreshTokenHash || sha256(payload.jti) !== user.refreshTokenHash) {
    // The presented token doesn't match the last-issued one for this
    // version — either a stolen/replayed already-rotated token, or a forged
    // one. Invalidate the whole session defensively.
    await userRepository.updateById(user._id, {
      refreshTokenHash: null,
      $inc: { refreshTokenVersion: 1 },
    });
    throw ApiError.unauthorized('Refresh token reuse detected, session invalidated');
  }

  const tokens = await issueTokenPair(user);
  return { user: toPublicUser(user), ...tokens };
}

export async function logout(userId) {
  await userRepository.updateById(userId, { refreshTokenHash: null });
}

export async function logoutAll(userId) {
  await userRepository.updateById(userId, {
    refreshTokenHash: null,
    $inc: { refreshTokenVersion: 1 },
  });
}

export { toPublicUser };
