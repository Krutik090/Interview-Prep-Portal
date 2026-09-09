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

// Stricter limiter for auth endpoints (login/register/refresh) to blunt
// credential stuffing / brute force. The limit is relaxed in test env so
// functional test suites (which legitimately issue many sequential
// register/login/refresh calls from the same IP) don't cross-contaminate —
// the limiter's own behavior is exercised by a dedicated rate-limit test
// instead of the functional auth/onboarding/profile suites.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore('rl:auth:'),
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
