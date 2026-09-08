import request from 'supertest';
import { createApp } from '../../src/app.js';
import { connect, closeDatabase, clearDatabase } from '../helpers/dbHandler.js';

const app = createApp();

beforeAll(async () => connect());
afterEach(async () => clearDatabase());
afterAll(async () => closeDatabase());

describe('Injection attempts', () => {
  it('rejects a NoSQL operator-injection login payload instead of executing it', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'victim@example.com', password: 'correct horse battery' });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'victim@example.com', password: { $gt: '' } });

    // zod's string() schema rejects a non-string password outright (400),
    // rather than letting an operator object reach the database layer.
    expect(res.status).toBe(400);
  });

  it('rejects a $-operator-shaped email field on login', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: { $ne: null }, password: 'anything' });
    expect(res.status).toBe(400);
  });

  it('rejects extra/unknown fields on register (mass-assignment guard)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'x@example.com', password: 'correct horse battery', role: 'admin' });
    expect(res.status).toBe(400);
  });
});
