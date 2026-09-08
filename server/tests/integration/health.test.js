import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('GET /api/v1/health', () => {
  it('returns 200 with an ok status', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });

  it('returns a 404 with no stack trace for an unknown route', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).not.toHaveProperty('stack');
  });
});
