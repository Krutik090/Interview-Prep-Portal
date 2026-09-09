import { jest } from '@jest/globals';

jest.unstable_mockModule('../../../src/config/env.js', () => ({
  env: { isProduction: true },
}));

const { errorHandler } = await import('../../../src/middlewares/errorHandler.js');
const { ApiError } = await import('../../../src/utils/ApiError.js');

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

const req = { originalUrl: '/api/v1/whatever', method: 'GET' };

describe('errorHandler in production', () => {
  it('never leaks the internal message or stack for a generic (non-ApiError) error', () => {
    const res = mockRes();
    const err = new Error('db connection string: mongodb://admin:supersecret@internal-host');
    errorHandler(err, req, res, () => {});

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Internal server error');
    expect(res.body).not.toHaveProperty('stack');
    expect(JSON.stringify(res.body)).not.toContain('supersecret');
  });

  it('still returns the intended message and status for an ApiError (operational, safe to show)', () => {
    const res = mockRes();
    errorHandler(ApiError.notFound('Training program not found'), req, res, () => {});

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Training program not found');
    expect(res.body).not.toHaveProperty('stack');
  });

  it('converts a Multer file-size error into a 400 instead of a generic 500', async () => {
    const multer = (await import('multer')).default;
    const res = mockRes();
    const err = new multer.MulterError('LIMIT_FILE_SIZE');
    errorHandler(err, req, res, () => {});

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Uploaded file is too large');
  });
});
