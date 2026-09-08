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

const programPayload = {
  title: 'Backend Aptitude Track',
  roundType: 'Aptitude',
  description: 'Covers quant and logical reasoning.',
};

describe('Training programs (admin CRUD, student catalog)', () => {
  it('rejects a student creating a training program', async () => {
    const token = await makeStudent();
    const res = await request(app)
      .post('/api/v1/trainings')
      .set('Authorization', `Bearer ${token}`)
      .send(programPayload);
    expect(res.status).toBe(403);
  });

  it('lets an admin create, publish, and a student see only published programs', async () => {
    const adminToken = await makeAdmin();
    const created = await request(app)
      .post('/api/v1/trainings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(programPayload);
    expect(created.status).toBe(201);
    expect(created.body.program.status).toBe('draft');

    const studentToken = await makeStudent();
    const beforePublish = await request(app)
      .get('/api/v1/trainings')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(beforePublish.body.programs).toHaveLength(0);

    await request(app)
      .patch(`/api/v1/trainings/${created.body.program._id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ publish: true })
      .expect(200);

    const afterPublish = await request(app)
      .get('/api/v1/trainings')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(afterPublish.body.programs).toHaveLength(1);
  });

  it('forbids a student from fetching a draft program directly by id (IDOR check)', async () => {
    const adminToken = await makeAdmin();
    const created = await request(app)
      .post('/api/v1/trainings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(programPayload);
    expect(created.body.program.status).toBe('draft');

    const studentToken = await makeStudent();
    const asStudent = await request(app)
      .get(`/api/v1/trainings/${created.body.program._id}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(asStudent.status).toBe(404);

    const asAdmin = await request(app)
      .get(`/api/v1/trainings/${created.body.program._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(asAdmin.status).toBe(200);
  });

  it('creates all four module types under a program and lists them in order', async () => {
    const adminToken = await makeAdmin();
    const program = (
      await request(app)
        .post('/api/v1/trainings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(programPayload)
    ).body.program;

    const modulesToCreate = [
      { type: 'material', title: 'Intro reading', contentBody: 'Read this first.' },
      {
        type: 'quiz',
        title: 'Quant quiz',
        questions: [
          { questionText: '2+2?', type: 'mcq', options: ['3', '4'], correctAnswerIndex: 1, points: 1 },
        ],
      },
      { type: 'ai_interview', title: 'Mock HR round', numQuestions: 3 },
      { type: 'gd_submission', title: 'GD practice', prompt: 'Discuss remote work.' },
    ];

    for (const payload of modulesToCreate) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app)
        .post(`/api/v1/trainings/${program._id}/modules`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);
      expect(res.status).toBe(201);
      expect(res.body.module.type).toBe(payload.type);
    }

    const list = await request(app)
      .get(`/api/v1/trainings/${program._id}/modules`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(list.body.modules).toHaveLength(4);
  });

  it('rejects a module update whose type does not match the existing module', async () => {
    const adminToken = await makeAdmin();
    const program = (
      await request(app)
        .post('/api/v1/trainings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(programPayload)
    ).body.program;

    const module = (
      await request(app)
        .post(`/api/v1/trainings/${program._id}/modules`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'material', title: 'Intro', contentBody: 'x' })
    ).body.module;

    const res = await request(app)
      .patch(`/api/v1/trainings/${program._id}/modules/${module._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'quiz', questions: [] });
    expect(res.status).toBe(400);
  });

  it('hides unpublished modules from students but shows them to admins', async () => {
    const adminToken = await makeAdmin();
    const program = (
      await request(app)
        .post('/api/v1/trainings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(programPayload)
    ).body.program;
    await request(app)
      .patch(`/api/v1/trainings/${program._id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ publish: true });

    const module = (
      await request(app)
        .post(`/api/v1/trainings/${program._id}/modules`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'material', title: 'Draft content', contentBody: 'x' })
    ).body.module;

    const studentToken = await makeStudent();
    const asStudent = await request(app)
      .get(`/api/v1/trainings/${program._id}/modules/${module._id}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(asStudent.status).toBe(404);

    const asAdmin = await request(app)
      .get(`/api/v1/trainings/${program._id}/modules/${module._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(asAdmin.status).toBe(200);
  });

  it('returns an AI-drafted quiz for admin review without persisting it', async () => {
    mockGenerateContent.mockResolvedValue(
      JSON.stringify({
        questions: [
          { questionText: 'What is Big-O of binary search?', type: 'short_answer', correctAnswerText: 'O(log n)', points: 1 },
        ],
      }),
    );

    const adminToken = await makeAdmin();
    const program = (
      await request(app)
        .post('/api/v1/trainings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(programPayload)
    ).body.program;
    const module = (
      await request(app)
        .post(`/api/v1/trainings/${program._id}/modules`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'quiz', title: 'Placeholder', questions: [{ questionText: 'x', type: 'short_answer', points: 1 }] })
    ).body.module;

    const res = await request(app)
      .post(`/api/v1/trainings/${program._id}/modules/${module._id}/ai-draft`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ contentType: 'quiz', topic: 'algorithms', count: 1 });

    expect(res.status).toBe(200);
    expect(res.body.draft.questions[0].questionText).toContain('Big-O');

    // Not persisted onto the module.
    const reloaded = await request(app)
      .get(`/api/v1/trainings/${program._id}/modules/${module._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(reloaded.body.module.questions[0].questionText).toBe('x');
  });

  it('rejects reordering with an id that is not part of the program', async () => {
    const adminToken = await makeAdmin();
    const program = (
      await request(app)
        .post('/api/v1/trainings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(programPayload)
    ).body.program;

    const res = await request(app)
      .patch(`/api/v1/trainings/${program._id}/modules/reorder`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ moduleOrder: ['507f1f77bcf86cd799439011'] });
    expect(res.status).toBe(400);
  });
});
