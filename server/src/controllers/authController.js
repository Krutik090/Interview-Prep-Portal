import { asyncHandler } from '../utils/asyncHandler.js';
import { parseDurationToMs } from '../utils/duration.js';
import { env } from '../config/env.js';
import * as authService from '../services/authService.js';
import * as userRepository from '../repositories/userRepository.js';
import { toPublicUser } from '../services/authService.js';

const REFRESH_COOKIE_NAME = 'refreshToken';

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    path: '/api/v1/auth',
    maxAge: parseDurationToMs(env.JWT_REFRESH_TTL),
  };
}

function sendAuthResponse(res, statusCode, { user, accessToken, refreshToken }) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
  res.status(statusCode).json({ user, accessToken });
}

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  sendAuthResponse(res, 201, result);
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  sendAuthResponse(res, 200, result);
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  const result = await authService.refresh(token);
  sendAuthResponse(res, 200, result);
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.id);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
  res.status(204).send();
});

export const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req.user.id);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
  res.status(204).send();
});

export const me = asyncHandler(async (req, res) => {
  const user = await userRepository.findById(req.user.id);
  res.status(200).json({ user: toPublicUser(user) });
});
