import fs from 'node:fs/promises';
import path from 'node:path';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { connect, closeDatabase, clearDatabase } from '../helpers/dbHandler.js';

const app = createApp();

// A minimal valid 1x1 PNG (real magic bytes), vs. a plain-text buffer that
// merely *claims* to be image/png via its declared content-type/extension —
// the declared mimetype is exactly what an attacker controls.
const REAL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==',
  'base64',
);
const SPOOFED_PNG = Buffer.from('<script>this is not actually a png</script>');

const storageDir = path.join(process.cwd(), 'storage', 'avatars');

beforeAll(async () => connect());
afterEach(async () => clearDatabase());
afterAll(async () => {
  await closeDatabase();
  await fs.rm(storageDir, { recursive: true, force: true }).catch(() => {});
});

async function makeStudent() {
  const register = await request(app)
    .post('/api/v1/auth/register')
    .send({ email: 'student@example.com', password: 'correct horse battery' });
  return register.body.accessToken;
}

describe('Upload content-type verification (magic bytes)', () => {
  it('accepts a real image whose bytes match the declared type', async () => {
    const token = await makeStudent();
    const res = await request(app)
      .post('/api/v1/profile/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('avatar', REAL_PNG, { filename: 'photo.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
  });

  it('rejects a file whose declared content-type does not match its actual bytes', async () => {
    const token = await makeStudent();
    const res = await request(app)
      .post('/api/v1/profile/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('avatar', SPOOFED_PNG, { filename: 'photo.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
  });

  it('rejects an oversized-looking mimetype outright via the declared-type filter', async () => {
    const token = await makeStudent();
    const res = await request(app)
      .post('/api/v1/profile/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('avatar', REAL_PNG, { filename: 'photo.exe', contentType: 'application/x-msdownload' });
    expect(res.status).toBe(400);
  });
});
