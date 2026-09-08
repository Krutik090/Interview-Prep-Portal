import { jest } from '@jest/globals';
import request from 'supertest';
import { connect, closeDatabase, clearDatabase } from '../helpers/dbHandler.js';

const mockAdd = jest.fn().mockResolvedValue({ id: 'job1' });

jest.unstable_mockModule('../../src/jobs/queues.js', () => ({
  QUEUE_NAMES: { AI_PROFILE: 'ai-profile' },
  getQueue: () => ({ add: mockAdd }),
}));

const { createApp } = await import('../../src/app.js');
const { User } = await import('../../src/models/User.js');
const app = createApp();

beforeAll(async () => connect());
afterEach(async () => {
  await clearDatabase();
  mockAdd.mockClear();
});
afterAll(async () => closeDatabase());

const validAnswers = {
  education: { degree: 'B.Tech', institution: 'ABC University', graduationYear: 2025, branch: 'CSE' },
  targetRole: 'Backend Engineer',
  targetDomain: 'Product-based',
  experienceLevel: 'fresher',
  currentSkills: ['JavaScript'],
  strengths: [],
  weaknesses: [],
  preferredCompanies: [],
};

async function onboardedStudent(email = 'student@example.com') {
  const register = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'correct horse battery' });
  const token = register.body.accessToken;
  await request(app)
    .post('/api/v1/onboarding/submit')
    .set('Authorization', `Bearer ${token}`)
    .send(validAnswers);
  return { token, userId: register.body.user.id };
}

async function makeAdmin(email = 'admin@example.com') {
  const register = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'correct horse battery' });
  await User.findByIdAndUpdate(register.body.user.id, { role: 'admin' });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: 'correct horse battery' });
  return login.body.accessToken;
}

describe('Profile', () => {
  it('returns 404 before onboarding is completed', async () => {
    const register = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'new@example.com', password: 'correct horse battery' });
    const res = await request(app)
      .get('/api/v1/profile/me')
      .set('Authorization', `Bearer ${register.body.accessToken}`);
    expect(res.status).toBe(404);
  });

  it('returns the profile after onboarding', async () => {
    const { token } = await onboardedStudent();
    const res = await request(app).get('/api/v1/profile/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.profile.targetRole).toBe('Backend Engineer');
  });

  it('updates editable fields and sanitizes/rejects unknown fields', async () => {
    const { token } = await onboardedStudent();
    const res = await request(app)
      .patch('/api/v1/profile/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetRole: 'Senior Backend Engineer', notAllowed: 'x' });
    expect(res.status).toBe(400);

    const ok = await request(app)
      .patch('/api/v1/profile/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetRole: 'Senior Backend Engineer' });
    expect(ok.status).toBe(200);
    expect(ok.body.profile.targetRole).toBe('Senior Backend Engineer');
  });

  it('queues an AI summary refresh on demand', async () => {
    const { token } = await onboardedStudent();
    const res = await request(app)
      .post('/api/v1/profile/me/refresh-ai-summary')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(202);
    expect(mockAdd).toHaveBeenCalled();
  });

  it('forbids a student from viewing another student profile by id', async () => {
    const { token } = await onboardedStudent('a@example.com');
    const { userId: otherId } = await onboardedStudent('b@example.com');
    const res = await request(app)
      .get(`/api/v1/profile/${otherId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('allows an admin to view any student profile by id', async () => {
    const { userId } = await onboardedStudent();
    const adminToken = await makeAdmin();
    const res = await request(app)
      .get(`/api/v1/profile/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});
