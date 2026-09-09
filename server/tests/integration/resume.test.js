import { jest } from '@jest/globals';
import fs from 'node:fs/promises';
import path from 'node:path';
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
  QUEUE_NAMES: { AI_RESUME: 'ai-resume' },
  getQueue: () => ({ add: mockQueueAdd }),
}));

const { createApp } = await import('../../src/app.js');
const { generateResume } = await import('../../src/jobs/workers/resumeWorker.js');
const app = createApp();

const testStorageDir = path.join(process.cwd(), 'storage', 'resumes');

beforeAll(async () => connect());
afterEach(async () => {
  await clearDatabase();
  mockGenerateContent.mockReset();
  mockQueueAdd.mockClear();
});
afterAll(async () => {
  await closeDatabase();
  await fs.rm(testStorageDir, { recursive: true, force: true });
});

async function makeStudent(email = 'student@example.com') {
  const register = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'correct horse battery' });
  return { token: register.body.accessToken, userId: register.body.user.id };
}

async function makeAdmin() {
  const { User } = await import('../../src/models/User.js');
  const register = await request(app)
    .post('/api/v1/auth/register')
    .send({ email: 'admin@example.com', password: 'correct horse battery' });
  await User.findByIdAndUpdate(register.body.user.id, { role: 'admin' });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@example.com', password: 'correct horse battery' });
  return login.body.accessToken;
}

async function completeAndPassOneQuiz(studentToken, adminToken) {
  const program = (
    await request(app)
      .post('/api/v1/trainings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Track', roundType: 'Aptitude' })
  ).body.program;
  await request(app)
    .patch(`/api/v1/trainings/${program._id}/publish`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ publish: true });
  const payload = {
    type: 'quiz',
    title: 'Quiz',
    questions: [{ questionText: '2+2', type: 'mcq', options: ['3', '4'], correctAnswerIndex: 1, points: 1 }],
  };
  const created = await request(app)
    .post(`/api/v1/trainings/${program._id}/modules`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send(payload);
  await request(app)
    .patch(`/api/v1/trainings/${program._id}/modules/${created.body.module._id}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ ...payload, status: 'published' });

  await request(app)
    .post('/api/v1/enrollments')
    .set('Authorization', `Bearer ${studentToken}`)
    .send({ programId: program._id });
  await request(app)
    .post(`/api/v1/submissions/quiz/${created.body.module._id}`)
    .set('Authorization', `Bearer ${studentToken}`)
    .send({ answers: [{ questionIndex: 0, answerText: '1' }] });
}

describe('Resume generation', () => {
  it('reports ineligible before passing any training', async () => {
    const { token } = await makeStudent();
    const res = await request(app).get('/api/v1/resume/eligibility').set('Authorization', `Bearer ${token}`);
    expect(res.body.eligible).toBe(false);
  });

  it('rejects generation when ineligible, even if requested directly', async () => {
    const { token } = await makeStudent();
    const res = await request(app).post('/api/v1/resume/generate').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('generates a real downloadable PDF after passing a training, using AI-polished content', async () => {
    const adminToken = await makeAdmin();
    const { token: studentToken, userId } = await makeStudent();
    await completeAndPassOneQuiz(studentToken, adminToken);

    const eligibility = await request(app)
      .get('/api/v1/resume/eligibility')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(eligibility.body.eligible).toBe(true);

    const generateRes = await request(app)
      .post('/api/v1/resume/generate')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(generateRes.status).toBe(202);
    expect(mockQueueAdd).toHaveBeenCalledWith('generate', { studentId: userId });

    mockGenerateContent.mockResolvedValueOnce(
      JSON.stringify({
        summary: 'A driven aspiring engineer.',
        skillsSection: ['JavaScript'],
        projectsSection: [],
        achievementsSection: ['Passed the Aptitude track.'],
      }),
    );
    await generateResume(userId);

    const statusRes = await request(app)
      .get('/api/v1/resume/status')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(statusRes.body.resume.status).toBe('ready');
    expect(statusRes.body.resume.aiPolishedContent.summary).toBe('A driven aspiring engineer.');

    const downloadRes = await request(app)
      .get('/api/v1/resume/download')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(downloadRes.status).toBe(200);
    expect(downloadRes.headers['content-type']).toBe('application/pdf');
    expect(downloadRes.headers['content-disposition']).toContain('attachment');
    // A real PDF was rendered, not a stub — sanity-check the magic bytes.
    expect(downloadRes.body.slice(0, 4).toString()).toBe('%PDF');
  }, 30000);

  it('falls back to rule-based content when Gemini fails, and still produces a PDF', async () => {
    const adminToken = await makeAdmin();
    const { token: studentToken, userId } = await makeStudent();
    await completeAndPassOneQuiz(studentToken, adminToken);
    await request(app).post('/api/v1/resume/generate').set('Authorization', `Bearer ${studentToken}`);

    mockGenerateContent.mockRejectedValueOnce(new Error('Gemini is down'));
    await generateResume(userId);

    const statusRes = await request(app)
      .get('/api/v1/resume/status')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(statusRes.body.resume.status).toBe('ready');
    expect(statusRes.body.resume.aiPolishedContent.summary).toEqual(expect.any(String));
  }, 30000);

  it('404s when another student tries to download a resume that is not theirs', async () => {
    const adminToken = await makeAdmin();
    const { token: aToken, userId: aId } = await makeStudent('a@example.com');
    await completeAndPassOneQuiz(aToken, adminToken);
    await request(app).post('/api/v1/resume/generate').set('Authorization', `Bearer ${aToken}`);
    mockGenerateContent.mockResolvedValueOnce(
      JSON.stringify({ summary: 'x', skillsSection: [], projectsSection: [], achievementsSection: [] }),
    );
    await generateResume(aId);

    const { token: bToken } = await makeStudent('b@example.com');
    const res = await request(app).get('/api/v1/resume/download').set('Authorization', `Bearer ${bToken}`);
    expect(res.status).toBe(404);
  }, 30000);
});
