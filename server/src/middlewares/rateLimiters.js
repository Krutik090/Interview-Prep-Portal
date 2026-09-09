import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../config/redis.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// rate-limit-redis's RedisStore constructor eagerly (and asynchronously,
// unawaited) loads a Lua script over the connection — if Redis isn't
// reachable yet, that fires an unhandled rejection at *module load time*
// and crashes the whole process before the server even starts. Probing
// connectivity first (once, at startup) and falling back to the in-memory
// store when Redis is unavailable keeps every rate limiter's own behavior
// consistent with the rest of the app: a Redis outage is never fatal.
const redisAvailable = env.isTest
  ? false
  : await redisClient
      .connect()
      .then(() => true)
      .catch((err) => {
        logger.warn({ err }, 'Redis unavailable at startup — rate limiters will use in-memory storage');
        return false;
      });

function redisStore(prefix) {
  if (!redisAvailable) return undefined;
  return new RedisStore({
    prefix,
    sendCommand: (...args) => redisClient.call(...args),
  });
}

// Global baseline — applied to every route.
export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore('rl:global:'),
});

// Login and registration each get their own budget rather than sharing one
// (as they originally did) — a few background token-refresh calls or one
// registration shouldn't eat into the budget meant to slow down password
// guessing on /login. Refresh itself isn't given a strict limiter at all:
// a refresh token is a high-entropy value, not a guessable secret, so
// there's nothing here for a brute-force limiter to protect against beyond
// what the global per-IP limiter (app.js) already covers.
//
// Limits are relaxed in test env so functional test suites (which
// legitimately issue many sequential register/login calls from the same
// IP) don't cross-contaminate — the limiter's own behavior is exercised by
// a dedicated rate-limit test instead of the functional auth suites.
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore('rl:login:'),
  message: { message: 'Too many login attempts, please try again later.' },
});

export const registerRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore('rl:register:'),
  message: { message: 'Too many attempts, please try again later.' },
});

// Per-authenticated-user limiter for routes that trigger a Gemini call, kept
// independent of the IP-based limiters above to protect API quota/cost.
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore('rl:ai:'),
  keyGenerator: (req) => req.user?.id ?? req.ip,
  message: { message: 'Too many AI requests, please slow down.' },
});
