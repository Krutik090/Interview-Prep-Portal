import { jest } from '@jest/globals';
import request from 'supertest';
import { connect, closeDatabase, clearDatabase } from '../helpers/dbHandler.js';

const mockGenerateContent = jest.fn();
jest.unstable_mockModule('../../src/config/geminiClient.js', () => ({
  generateContent: mockGenerateContent,
  isRateLimitError: () => false,
  isTransientError: () => true,
}));

const mockQueueAdd = jest.fn().mockResolvedValue({});
jest.unstable_mockModule('../../src/jobs/queues.js', () => ({
  QUEUE_NAMES: { AI_PROFILE: 'ai-profile' },
  getQueue: () => ({ add: mockQueueAdd }),
}));

const { createApp } = await import('../../src/app.js');
const { User } = await import('../../src/models/User.js');
const app = createApp();

beforeAll(async () => connect());
afterEach(async () => {
  await clearDatabase();
  mockGenerateContent.mockReset();
  mockQueueAdd.mockClear();
});
afterAll(async () => closeDatabase());

async function makeAdmin() {
  const register = await request(app)
    .post('/api/v1/auth/register')
    .send({ email: 'admin@example.com', password: 'correct horse battery' });
  await User.findByIdAndUpdate(register.body.user.id, { role: 'admin' });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@example.com', password: 'correct horse battery' });
  return login.body.accessToken;
}

async function makeStudent(email) {
  const register = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'correct horse battery' });
  return register.body.accessToken;
}

describe('Admin endpoints', () => {
  it('rejects a student hitting any /admin route', async () => {
    const token = await makeStudent('student@example.com');
    for (const path of ['/api/v1/admin/students', '/api/v1/admin/dashboard/stats', '/api/v1/admin/ai-usage']) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app).get(path).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    }
  });

  it('lists students', async () => {
    const adminToken = await makeAdmin();
    await makeStudent('a@example.com');
    await makeStudent('b@example.com');

    const res = await request(app).get('/api/v1/admin/students').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.students).toHaveLength(2);
  });

  it('returns dashboard stats', async () => {
    const adminToken = await makeAdmin();
    await makeStudent('a@example.com');

    const res = await request(app)
      .get('/api/v1/admin/dashboard/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.stats).toMatchObject({ totalStudents: 1, totalEnrollments: 0, pendingGdReviews: 0 });
  });

  it('returns aggregated AI usage after an AI call has been logged', async () => {
    mockGenerateContent.mockResolvedValueOnce(
      JSON.stringify({ summary: 'x', suggestedTracks: ['HR'] }),
    );
    // Calling aiService directly here (rather than through an endpoint) is
    // enough to exercise real AiInteractionLog writes, which is what this
    // test actually checks.
    const { summarizeProfile } = await import('../../src/services/aiService.js');
    await summarizeProfile({
      userId: '507f1f77bcf86cd799439011',
      onboardingAnswers: { targetRole: 'x', experienceLevel: 'fresher' },
    });

    const adminToken = await makeAdmin();
    const res = await request(app).get('/api/v1/admin/ai-usage').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.usage.some((row) => row.operation === 'profile_summary' && row.status === 'success')).toBe(
      true,
    );
  });
});
