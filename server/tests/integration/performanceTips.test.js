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
  QUEUE_NAMES: { AI_PROFILE: 'ai-profile', AI_INTERVIEW: 'ai-interview', AI_TIPS: 'ai-tips' },
  getQueue: () => ({ add: mockQueueAdd }),
}));

const { createApp } = await import('../../src/app.js');
const { generateTipsForSubmission } = await import('../../src/jobs/workers/performanceTipsWorker.js');
const app = createApp();

beforeAll(async () => connect());
afterEach(async () => {
  await clearDatabase();
  mockGenerateContent.mockReset();
  mockQueueAdd.mockClear();
});
afterAll(async () => closeDatabase());

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

async function makeStudent(email = 'student@example.com') {
  const register = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'correct horse battery' });
  return register.body.accessToken;
}

async function createPublishedQuizModule(adminToken, programId) {
  const payload = {
    type: 'quiz',
    title: 'Quiz',
    questions: [{ questionText: '2+2', type: 'mcq', options: ['3', '4'], correctAnswerIndex: 1, points: 1 }],
  };
  const created = await request(app)
    .post(`/api/v1/trainings/${programId}/modules`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send(payload);
  await request(app)
    .patch(`/api/v1/trainings/${programId}/modules/${created.body.module._id}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ ...payload, status: 'published' });
  return created.body.module;
}

describe('Performance tips', () => {
  it('generates and returns a performance tip after grading a quiz', async () => {
    const adminToken = await makeAdmin();
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
    const module = await createPublishedQuizModule(adminToken, program._id);

    const studentToken = await makeStudent();
    await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ programId: program._id });

    const submitted = await request(app)
      .post(`/api/v1/submissions/quiz/${module._id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answers: [{ questionIndex: 0, answerText: '1' }] });
    expect(mockQueueAdd).toHaveBeenCalledWith('generateTips', {
      submissionId: submitted.body.submission._id,
    });

    // Not ready yet — the queue is mocked, so the worker hasn't actually run.
    const before = await request(app)
      .get(`/api/v1/submissions/${submitted.body.submission._id}/performance-tips`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(before.body.ready).toBe(false);

    mockGenerateContent.mockResolvedValueOnce(JSON.stringify({ tips: 'Practice more arithmetic.' }));
    await generateTipsForSubmission(submitted.body.submission._id);

    const after = await request(app)
      .get(`/api/v1/submissions/${submitted.body.submission._id}/performance-tips`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(after.body.ready).toBe(true);
    expect(after.body.performanceTips.text).toBe('Practice more arithmetic.');
  });

  it('forbids a student from reading another student\'s performance tips', async () => {
    const adminToken = await makeAdmin();
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
    const module = await createPublishedQuizModule(adminToken, program._id);

    const aRegister = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'a@example.com', password: 'correct horse battery' });
    await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${aRegister.body.accessToken}`)
      .send({ programId: program._id });
    const submitted = await request(app)
      .post(`/api/v1/submissions/quiz/${module._id}`)
      .set('Authorization', `Bearer ${aRegister.body.accessToken}`)
      .send({ answers: [{ questionIndex: 0, answerText: '1' }] });

    const bToken = await makeStudent();
    const res = await request(app)
      .get(`/api/v1/submissions/${submitted.body.submission._id}/performance-tips`)
      .set('Authorization', `Bearer ${bToken}`);
    expect(res.status).toBe(403);
  });
});
