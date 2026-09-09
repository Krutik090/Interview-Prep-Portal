import express from 'express';
import request from 'supertest';
import rateLimit from 'express-rate-limit';

// Exercises the express-rate-limit wiring pattern in isolation (a fresh,
// low-limit instance) rather than the app's real loginRateLimiter/
// registerRateLimiter, which are deliberately relaxed in test env — see
// rateLimiters.js — to avoid cross-contaminating the functional auth/
// onboarding/profile suites that share one app instance and IP.
describe('rate limiter wiring', () => {
  it('returns 429 once the limit is exceeded within the window', async () => {
    const app = express();
    app.use(rateLimit({ windowMs: 60_000, limit: 3, standardHeaders: true, legacyHeaders: false }));
    app.get('/ping', (req, res) => res.status(200).json({ ok: true }));

    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app).get('/ping');
      expect(res.status).toBe(200);
    }

    const limited = await request(app).get('/ping');
    expect(limited.status).toBe(429);
  });
});
