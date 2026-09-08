import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { connect, closeDatabase, clearDatabase } from '../helpers/dbHandler.js';

const app = createApp();

beforeAll(async () => connect());
afterEach(async () => clearDatabase());
afterAll(async () => closeDatabase());

describe('RBAC / ownership bypass attempts', () => {
  it('rejects a JWT forged with a different secret (role: admin claim)', async () => {
    const forged = jwt.sign({ sub: '507f1f77bcf86cd799439011', role: 'admin' }, 'wrong-secret', {
      expiresIn: '15m',
    });
    const res = await request(app)
      .get('/api/v1/profile/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it('rejects a student calling an admin-only route even with a well-formed but non-admin token', async () => {
    const register = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'student@example.com', password: 'correct horse battery' });

    const res = await request(app)
      .get(`/api/v1/profile/${register.body.user.id}`)
      .set('Authorization', `Bearer ${register.body.accessToken}`);
    // A student hitting the admin-only-by-id route, even for their own id,
    // must be rejected by the role check (they should use /profile/me instead).
    expect(res.status).toBe(403);
  });

  it('rejects an expired access token', async () => {
    const expired = jwt.sign(
      { sub: '507f1f77bcf86cd799439011', role: 'student' },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: -10 },
    );
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });
});
