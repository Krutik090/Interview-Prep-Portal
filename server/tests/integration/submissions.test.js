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
  QUEUE_NAMES: { AI_PROFILE: 'ai-profile', AI_INTERVIEW: 'ai-interview' },
  getQueue: () => ({ add: mockQueueAdd }),
}));

const { createApp } = await import('../../src/app.js');
const { User } = await import('../../src/models/User.js');
const { generateQuestions, evaluateAnswers } = await import('../../src/jobs/workers/interviewWorker.js');
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

async function makeStudent(email = 'student@example.com') {
  const register = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'correct horse battery' });
  return register.body.accessToken;
}

async function createModule(adminToken, programId, payload) {
  const res = await request(app)
    .post(`/api/v1/trainings/${programId}/modules`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send(payload);
  await request(app)
    .patch(`/api/v1/trainings/${programId}/modules/${res.body.module._id}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ ...payload, status: 'published' });
  return res.body.module;
}

describe('Student training experience', () => {
  it('completes a program across all four module types and the enrollment resolves to passed', async () => {
    const adminToken = await makeAdmin();
    const program = (
      await request(app)
        .post('/api/v1/trainings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Full Track', roundType: 'Technical' })
    ).body.program;
    await request(app)
      .patch(`/api/v1/trainings/${program._id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ publish: true });

    const material = await createModule(adminToken, program._id, {
      type: 'material',
      title: 'Read me',
      contentBody: 'x',
    });
    const quiz = await createModule(adminToken, program._id, {
      type: 'quiz',
      title: 'Quiz',
      questions: [{ questionText: '2+2', type: 'mcq', options: ['3', '4'], correctAnswerIndex: 1, points: 1 }],
    });
    const interview = await createModule(adminToken, program._id, {
      type: 'ai_interview',
      title: 'Mock interview',
      numQuestions: 2,
    });
    const gd = await createModule(adminToken, program._id, {
      type: 'gd_submission',
      title: 'GD',
      prompt: 'Discuss remote work.',
    });

    const studentToken = await makeStudent();
    await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ programId: program._id })
      .expect(201);

    // Material: mark read.
    await request(app)
      .post(`/api/v1/trainings/${program._id}/modules/${material._id}/mark-read`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    // Quiz: correct answer, full score.
    await request(app)
      .post(`/api/v1/submissions/quiz/${quiz._id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answers: [{ questionIndex: 0, answerText: '1' }] })
      .expect(201);

    // AI interview: start (mocked queue), then run the worker steps directly
    // since the real BullMQ worker isn't running in this test process.
    mockGenerateContent.mockResolvedValueOnce(
      JSON.stringify({ questions: ['Tell me about yourself.', 'Why this role?'] }),
    );
    const started = await request(app)
      .post(`/api/v1/submissions/ai-interview/${interview._id}/start`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(202);
    await generateQuestions(started.body.submission._id);

    mockGenerateContent
      .mockResolvedValueOnce(JSON.stringify({ verdict: 'pass', score: 90, feedback: 'Good.' }))
      .mockResolvedValueOnce(JSON.stringify({ verdict: 'pass', score: 90, feedback: 'Good.' }));
    const answered = await request(app)
      .post(`/api/v1/submissions/ai-interview/${started.body.submission._id}/answer`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answers: ['I am a developer.', 'I like the mission.'] })
      .expect(202);
    await evaluateAnswers(answered.body.submission._id);

    // GD: submit text, admin reviews as pass.
    const gdSubmission = (
      await request(app)
        .post(`/api/v1/submissions/gd/${gd._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ text: 'Remote work improves flexibility.' })
        .expect(201)
    ).body.submission;
    await request(app)
      .patch(`/api/v1/submissions/gd/${gdSubmission._id}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ verdict: 'pass', comments: 'Solid answer.' })
      .expect(200);

    const enrollment = await request(app)
      .get('/api/v1/enrollments/me')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(enrollment.body.enrollments[0].status).toBe('passed');
    expect(enrollment.body.enrollments[0].completedModules).toBe(4);
  });

  it('fails the enrollment when the overall score is below the pass threshold', async () => {
    const adminToken = await makeAdmin();
    const program = (
      await request(app)
        .post('/api/v1/trainings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Strict Track', roundType: 'Aptitude', passCriteria: { minOverallScorePct: 90 } })
    ).body.program;
    await request(app)
      .patch(`/api/v1/trainings/${program._id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ publish: true });
    const quiz = await createModule(adminToken, program._id, {
      type: 'quiz',
      title: 'Quiz',
      questions: [{ questionText: '2+2', type: 'mcq', options: ['3', '4'], correctAnswerIndex: 1, points: 1 }],
    });

    const studentToken = await makeStudent();
    await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ programId: program._id });

    // Wrong answer -> 0%, below the 90% overall threshold.
    await request(app)
      .post(`/api/v1/submissions/quiz/${quiz._id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answers: [{ questionIndex: 0, answerText: '0' }] })
      .expect(201);

    const enrollment = await request(app)
      .get('/api/v1/enrollments/me')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(enrollment.body.enrollments[0].status).toBe('failed');
  });

  it('rejects submitting to a module the student never enrolled for', async () => {
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
    const quiz = await createModule(adminToken, program._id, {
      type: 'quiz',
      title: 'Quiz',
      questions: [{ questionText: '2+2', type: 'mcq', options: ['3', '4'], correctAnswerIndex: 1, points: 1 }],
    });

    const studentToken = await makeStudent();
    const res = await request(app)
      .post(`/api/v1/submissions/quiz/${quiz._id}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answers: [{ questionIndex: 0, answerText: '1' }] });
    expect(res.status).toBe(403);
  });

  it('forbids a student from reviewing a GD submission or reading another student\'s ai-interview submission', async () => {
    const adminToken = await makeAdmin();
    const program = (
      await request(app)
        .post('/api/v1/trainings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Track', roundType: 'GD' })
    ).body.program;
    await request(app)
      .patch(`/api/v1/trainings/${program._id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ publish: true });
    const interview = await createModule(adminToken, program._id, {
      type: 'ai_interview',
      title: 'Interview',
      numQuestions: 1,
    });
    const gd = await createModule(adminToken, program._id, { type: 'gd_submission', title: 'GD', prompt: 'x' });

    const a = await makeStudent('a@example.com');
    const b = await makeStudent('b@example.com');
    for (const token of [a, b]) {
      // eslint-disable-next-line no-await-in-loop
      await request(app)
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${token}`)
        .send({ programId: program._id });
    }

    mockGenerateContent.mockResolvedValueOnce(JSON.stringify({ questions: ['Q1'] }));
    const started = await request(app)
      .post(`/api/v1/submissions/ai-interview/${interview._id}/start`)
      .set('Authorization', `Bearer ${a}`);

    const bReadsA = await request(app)
      .get(`/api/v1/submissions/ai-interview/${started.body.submission._id}`)
      .set('Authorization', `Bearer ${b}`);
    expect(bReadsA.status).toBe(403);

    const gdSubmission = (
      await request(app)
        .post(`/api/v1/submissions/gd/${gd._id}`)
        .set('Authorization', `Bearer ${a}`)
        .send({ text: 'x' })
    ).body.submission;

    const studentReviews = await request(app)
      .patch(`/api/v1/submissions/gd/${gdSubmission._id}/review`)
      .set('Authorization', `Bearer ${b}`)
      .send({ verdict: 'pass', comments: 'x' });
    expect(studentReviews.status).toBe(403);
  });
});
