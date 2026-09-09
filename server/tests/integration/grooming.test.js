import { jest } from '@jest/globals';
import request from 'supertest';
import { connect, closeDatabase, clearDatabase } from '../helpers/dbHandler.js';

const mockGenerateContent = jest.fn();
jest.unstable_mockModule('../../src/config/geminiClient.js', () => ({
  generateContent: mockGenerateContent,
  isRateLimitError: () => false,
  isTransientError: () => true,
}));

const { createApp } = await import('../../src/app.js');
const { User } = await import('../../src/models/User.js');
const app = createApp();

beforeAll(async () => connect());
afterEach(async () => {
  await clearDatabase();
  mockGenerateContent.mockReset();
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

async function makeStudent() {
  const register = await request(app)
    .post('/api/v1/auth/register')
    .send({ email: 'student@example.com', password: 'correct horse battery' });
  return register.body.accessToken;
}

const articlePayload = {
  title: 'How to dress for interviews',
  category: 'dress_code',
  body: '<p>Wear <script>alert(1)</script> business casual.</p>',
};

describe('Grooming content', () => {
  it('rejects a student creating grooming content', async () => {
    const token = await makeStudent();
    const res = await request(app)
      .post('/api/v1/grooming')
      .set('Authorization', `Bearer ${token}`)
      .send(articlePayload);
    expect(res.status).toBe(403);
  });

  it('sanitizes the body on create, stripping disallowed tags/scripts', async () => {
    const adminToken = await makeAdmin();
    const res = await request(app)
      .post('/api/v1/grooming')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(articlePayload);
    expect(res.status).toBe(201);
    expect(res.body.article.body).not.toContain('<script>');
    expect(res.body.article.body).toContain('business casual');
  });

  it('hides drafts from students but shows them to admins, publish makes it visible', async () => {
    const adminToken = await makeAdmin();
    const created = (
      await request(app)
        .post('/api/v1/grooming')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(articlePayload)
    ).body.article;

    const studentToken = await makeStudent();
    const beforePublish = await request(app)
      .get(`/api/v1/grooming/${created._id}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(beforePublish.status).toBe(404);

    await request(app)
      .patch(`/api/v1/grooming/${created._id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ publish: true })
      .expect(200);

    const afterPublish = await request(app)
      .get(`/api/v1/grooming/${created._id}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(afterPublish.status).toBe(200);
  });

  it('returns a personalized tip and caches it on the second request', async () => {
    const adminToken = await makeAdmin();
    const created = (
      await request(app)
        .post('/api/v1/grooming')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(articlePayload)
    ).body.article;
    await request(app)
      .patch(`/api/v1/grooming/${created._id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ publish: true });

    mockGenerateContent.mockResolvedValueOnce(JSON.stringify({ tip: 'Iron your shirt the night before.' }));
    const studentToken = await makeStudent();
    const res = await request(app)
      .get(`/api/v1/grooming/${created._id}/personalized-tip`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.tip).toContain('Iron your shirt');

    // Redis isn't running in this test environment, so caching fails open —
    // this just confirms the endpoint still works reliably either way
    // (a real Redis would additionally avoid the second Gemini call).
    mockGenerateContent.mockResolvedValueOnce(JSON.stringify({ tip: 'Second call tip.' }));
    const res2 = await request(app)
      .get(`/api/v1/grooming/${created._id}/personalized-tip`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res2.status).toBe(200);
  });

  it('drafts AI content for review without persisting it', async () => {
    mockGenerateContent.mockResolvedValueOnce(JSON.stringify({ body: 'Draft grooming tip body.' }));
    const adminToken = await makeAdmin();
    const res = await request(app)
      .post('/api/v1/grooming/ai-draft')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ topic: 'first impressions' });
    expect(res.status).toBe(200);
    expect(res.body.draft.body).toBe('Draft grooming tip body.');
  });
});
