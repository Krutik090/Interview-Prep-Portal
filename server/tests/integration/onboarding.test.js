import { jest } from '@jest/globals';
import request from 'supertest';
import { connect, closeDatabase, clearDatabase } from '../helpers/dbHandler.js';

const mockAdd = jest.fn().mockResolvedValue({ id: 'job1' });

// Onboarding submit enqueues an AI-summarization job — mocked here so the
// test doesn't require a live Redis instance. The job's own logic (worker +
// aiService fallback) is covered separately in aiService.test.js and would
// be covered by a jobs/workers integration test against a real Redis in CI.
jest.unstable_mockModule('../../src/jobs/queues.js', () => ({
  QUEUE_NAMES: { AI_PROFILE: 'ai-profile' },
  getQueue: () => ({ add: mockAdd }),
}));

const { createApp } = await import('../../src/app.js');
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
  currentSkills: ['JavaScript', 'Node.js'],
  strengths: ['Problem solving'],
  weaknesses: ['Public speaking'],
  preferredCompanies: ['Acme Corp'],
};

async function registerAndGetToken() {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email: 'onboard@example.com', password: 'correct horse battery' });
  return res.body.accessToken;
}

describe('Onboarding flow', () => {
  it('serves the static questionnaire to an authenticated user', async () => {
    const token = await registerAndGetToken();
    const res = await request(app)
      .get('/api/v1/onboarding/questionnaire')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.sections.length).toBeGreaterThan(0);
  });

  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/onboarding/questionnaire');
    expect(res.status).toBe(401);
  });

  it('creates a profile from valid answers and queues AI summarization', async () => {
    const token = await registerAndGetToken();
    const res = await request(app)
      .post('/api/v1/onboarding/submit')
      .set('Authorization', `Bearer ${token}`)
      .send(validAnswers);

    expect(res.status).toBe(201);
    expect(res.body.profile.targetRole).toBe('Backend Engineer');
    expect(mockAdd).toHaveBeenCalledWith('summarize', expect.objectContaining({ userId: expect.any(String) }));
  });

  it('rejects a malformed submission (unknown field, bad enum)', async () => {
    const token = await registerAndGetToken();
    const res = await request(app)
      .post('/api/v1/onboarding/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validAnswers, experienceLevel: 'expert', extraField: 'not allowed' });

    expect(res.status).toBe(400);
  });

  it('rejects submitting onboarding twice', async () => {
    const token = await registerAndGetToken();
    await request(app)
      .post('/api/v1/onboarding/submit')
      .set('Authorization', `Bearer ${token}`)
      .send(validAnswers);

    const res = await request(app)
      .post('/api/v1/onboarding/submit')
      .set('Authorization', `Bearer ${token}`)
      .send(validAnswers);
    expect(res.status).toBe(409);
  });

  it('reports aiSummaryReady status', async () => {
    const token = await registerAndGetToken();
    const before = await request(app)
      .get('/api/v1/onboarding/status')
      .set('Authorization', `Bearer ${token}`);
    expect(before.body).toEqual({ onboardingCompleted: false, aiSummaryReady: false });

    await request(app)
      .post('/api/v1/onboarding/submit')
      .set('Authorization', `Bearer ${token}`)
      .send(validAnswers);

    const after = await request(app)
      .get('/api/v1/onboarding/status')
      .set('Authorization', `Bearer ${token}`);
    expect(after.body).toEqual({ onboardingCompleted: true, aiSummaryReady: false });
  });
});
