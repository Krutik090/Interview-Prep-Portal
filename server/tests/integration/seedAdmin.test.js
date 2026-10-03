import request from 'supertest';
import { connect, closeDatabase, clearDatabase } from '../helpers/dbHandler.js';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { ensureAdmin, parseCredentials } from '../../scripts/seedAdmin.js';

const app = createApp();
const EMAIL = 'placement.cell@college.edu';
const PASSWORD = 'orbit lantern seventeen';

beforeAll(connect);
afterEach(clearDatabase);
afterAll(closeDatabase);

function login(email, password) {
  return request(app).post('/api/v1/auth/login').send({ email, password });
}

describe('Admin seeder', () => {
  it('creates an admin who can log in and reach admin routes', async () => {
    expect(await ensureAdmin({ email: ` ${EMAIL.toUpperCase()} `, password: PASSWORD })).toBe('created');

    const res = await login(EMAIL, PASSWORD);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('admin');

    const stats = await request(app)
      .get('/api/v1/admin/dashboard/stats')
      .set('Authorization', `Bearer ${res.body.accessToken}`);
    expect(stats.status).toBe(200);
  });

  it('leaves an existing admin untouched when run again', async () => {
    await ensureAdmin({ email: EMAIL, password: PASSWORD });
    expect(await ensureAdmin({ email: EMAIL, password: 'a different passphrase' })).toBe('unchanged');

    expect((await login(EMAIL, PASSWORD)).status).toBe(200);
    expect(await User.countDocuments({ email: EMAIL })).toBe(1);
  });

  it('resets the password and invalidates existing sessions with --reset-password', async () => {
    await ensureAdmin({ email: EMAIL, password: PASSWORD });
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send({ email: EMAIL, password: PASSWORD }).expect(200);

    const newPassword = 'harbour quartz meadow';
    expect(await ensureAdmin({ email: EMAIL, password: newPassword, resetPassword: true })).toBe(
      'password-reset',
    );

    expect((await login(EMAIL, PASSWORD)).status).toBe(401);
    expect((await login(EMAIL, newPassword)).status).toBe(200);
    // The refresh cookie from before the reset no longer works.
    expect((await agent.post('/api/v1/auth/refresh')).status).toBe(401);
  });

  it('refuses to silently turn a student into an admin', async () => {
    await request(app).post('/api/v1/auth/register').send({ email: EMAIL, password: PASSWORD }).expect(201);

    await expect(ensureAdmin({ email: EMAIL, password: PASSWORD })).rejects.toThrow(/--promote/);
    expect((await User.findOne({ email: EMAIL })).role).toBe('student');

    expect(await ensureAdmin({ email: EMAIL, password: PASSWORD, promote: true })).toBe('promoted');
    expect((await User.findOne({ email: EMAIL })).role).toBe('admin');
  });

  it.each([
    [{ email: 'not-an-email', password: PASSWORD }, /valid email/],
    [{ email: EMAIL, password: 'short' }, /at least 12/],
    [{ email: EMAIL, password: 'Password123!' }, /too easy to guess/],
    [{ email: EMAIL, password: 'placement.cell-2026' }, /too easy to guess/],
    [{ email: undefined, password: undefined }, /valid email/],
  ])('rejects unsafe credentials %#', (input, message) => {
    expect(() => parseCredentials(input)).toThrow(message);
  });
});
