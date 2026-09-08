import request from 'supertest';
import { createApp } from '../../src/app.js';
import { connect, closeDatabase, clearDatabase } from '../helpers/dbHandler.js';

const app = createApp();

function extractRefreshCookie(res) {
  const setCookie = res.headers['set-cookie'] ?? [];
  const raw = setCookie.find((c) => c.startsWith('refreshToken='));
  return raw?.split(';')[0];
}

beforeAll(async () => connect());
afterEach(async () => clearDatabase());
afterAll(async () => closeDatabase());

describe('Auth flow', () => {
  const credentials = { email: 'student@example.com', password: 'correct horse battery' };

  it('registers a new student and returns tokens', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(credentials);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: credentials.email, role: 'student' });
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(extractRefreshCookie(res)).toBeDefined();
  });

  it('rejects duplicate registration', async () => {
    await request(app).post('/api/v1/auth/register').send(credentials);
    const res = await request(app).post('/api/v1/auth/register').send(credentials);
    expect(res.status).toBe(409);
  });

  it('rejects login with wrong password', async () => {
    await request(app).post('/api/v1/auth/register').send(credentials);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: 'wrong password' });
    expect(res.status).toBe(401);
  });

  it('allows GET /me with a valid access token', async () => {
    const register = await request(app).post('/api/v1/auth/register').send(credentials);
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${register.body.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(credentials.email);
  });

  it('rejects protected routes without a token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('rotates the refresh token on /refresh', async () => {
    const register = await request(app).post('/api/v1/auth/register').send(credentials);
    const cookie = extractRefreshCookie(register);

    const refreshed = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(refreshed.status).toBe(200);
    // Note: the new access token's *string* isn't guaranteed to differ from
    // the original if minted within the same second (JWTs with identical
    // claims + second-precision iat/exp are deterministically identical) —
    // that's not a security property we need. What must rotate is the
    // refresh token/cookie itself.
    expect(extractRefreshCookie(refreshed)).not.toBe(cookie);
  });

  it('detects refresh-token reuse and invalidates the session', async () => {
    const register = await request(app).post('/api/v1/auth/register').send(credentials);
    const originalCookie = extractRefreshCookie(register);

    // Legitimate rotation.
    const firstRefresh = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', originalCookie);
    expect(firstRefresh.status).toBe(200);
    const rotatedCookie = extractRefreshCookie(firstRefresh);

    // Replaying the already-rotated-out original cookie must be rejected...
    const replay = await request(app).post('/api/v1/auth/refresh').set('Cookie', originalCookie);
    expect(replay.status).toBe(401);

    // ...and must invalidate the session entirely, so even the rotated
    // (legitimately next-in-line) token no longer works.
    const afterInvalidation = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', rotatedCookie);
    expect(afterInvalidation.status).toBe(401);
  });

  it('logout clears the session so the refresh token stops working', async () => {
    const register = await request(app).post('/api/v1/auth/register').send(credentials);
    const cookie = extractRefreshCookie(register);

    await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${register.body.accessToken}`)
      .expect(204);

    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(res.status).toBe(401);
  });
});
