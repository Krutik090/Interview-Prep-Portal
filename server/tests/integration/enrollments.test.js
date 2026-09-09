import request from 'supertest';
import { createApp } from '../../src/app.js';
import { connect, closeDatabase, clearDatabase } from '../helpers/dbHandler.js';

const app = createApp();

beforeAll(async () => connect());
afterEach(async () => clearDatabase());
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
  return { token: register.body.accessToken, userId: register.body.user.id };
}

async function createPublishedProgram(adminToken) {
  const created = await request(app)
    .post('/api/v1/trainings')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ title: 'Aptitude Track', roundType: 'Aptitude', description: 'x' });
  await request(app)
    .patch(`/api/v1/trainings/${created.body.program._id}/publish`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ publish: true });
  return created.body.program;
}

describe('Enrollments', () => {
  it('lets a student enroll in a published program and rejects a duplicate enrollment', async () => {
    const adminToken = await makeAdmin();
    const program = await createPublishedProgram(adminToken);
    const { token } = await makeStudent();

    const first = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${token}`)
      .send({ programId: program._id });
    expect(first.status).toBe(201);
    expect(first.body.enrollment.status).toBe('in_progress');

    const second = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${token}`)
      .send({ programId: program._id });
    expect(second.status).toBe(409);
  });

  it('rejects enrolling in a draft (unpublished) program', async () => {
    const adminToken = await makeAdmin();
    const created = await request(app)
      .post('/api/v1/trainings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Draft Track', roundType: 'HR' });
    const { token } = await makeStudent();

    const res = await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${token}`)
      .send({ programId: created.body.program._id });
    expect(res.status).toBe(404);
  });

  it('lists only the requesting student\'s own enrollments', async () => {
    const adminToken = await makeAdmin();
    const program = await createPublishedProgram(adminToken);
    const a = await makeStudent('a@example.com');
    const b = await makeStudent('b@example.com');

    await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${a.token}`)
      .send({ programId: program._id });

    const listA = await request(app).get('/api/v1/enrollments/me').set('Authorization', `Bearer ${a.token}`);
    expect(listA.body.enrollments).toHaveLength(1);

    const listB = await request(app).get('/api/v1/enrollments/me').set('Authorization', `Bearer ${b.token}`);
    expect(listB.body.enrollments).toHaveLength(0);
  });

  it('forbids a student from viewing another student\'s enrollment detail', async () => {
    const adminToken = await makeAdmin();
    const program = await createPublishedProgram(adminToken);
    const a = await makeStudent('a@example.com');
    const b = await makeStudent('b@example.com');

    const enrollment = (
      await request(app)
        .post('/api/v1/enrollments')
        .set('Authorization', `Bearer ${a.token}`)
        .send({ programId: program._id })
    ).body.enrollment;

    const res = await request(app)
      .get(`/api/v1/enrollments/${enrollment._id}`)
      .set('Authorization', `Bearer ${b.token}`);
    expect(res.status).toBe(403);
  });

  it('lets an admin view the enrollment roster for a program, but not a student', async () => {
    const adminToken = await makeAdmin();
    const program = await createPublishedProgram(adminToken);
    const { token } = await makeStudent();
    await request(app)
      .post('/api/v1/enrollments')
      .set('Authorization', `Bearer ${token}`)
      .send({ programId: program._id });

    const asAdmin = await request(app)
      .get(`/api/v1/enrollments/program/${program._id}/roster`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.body.roster).toHaveLength(1);

    const asStudent = await request(app)
      .get(`/api/v1/enrollments/program/${program._id}/roster`)
      .set('Authorization', `Bearer ${token}`);
    expect(asStudent.status).toBe(403);
  });
});
