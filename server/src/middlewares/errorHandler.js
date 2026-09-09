import multer from 'multer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';

export function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// Multer surfaces both size-limit violations and fileFilter rejections as
// plain/Multer errors, not ApiError — without this they'd fall through to a
// generic 500 below instead of the 400 they actually are.
function normalizeMulterError(err) {
  if (err instanceof multer.MulterError) {
    return ApiError.badRequest(
      err.code === 'LIMIT_FILE_SIZE' ? 'Uploaded file is too large' : err.message,
    );
  }
  return err;
}

// Centralized error handler — must be the last middleware registered.
// Never leaks stack traces or internal error messages in production.
// eslint-disable-next-line no-unused-vars -- 4th param required for Express to treat this as error middleware
export function errorHandler(rawErr, req, res, next) {
  const err = normalizeMulterError(rawErr);
  const isApiError = err instanceof ApiError;
  const statusCode = isApiError ? err.statusCode : 500;

  logger.error(
    { err, statusCode, path: req.originalUrl, method: req.method },
    'Request error',
  );

  const body = {
    message: isApiError || !env.isProduction ? err.message : 'Internal server error',
  };
  if (isApiError && err.details) {
    body.details = err.details;
  }
  if (!env.isProduction && !isApiError) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
}
