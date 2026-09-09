import fs from 'node:fs/promises';
import { fileTypeFromFile } from 'file-type';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';

// Multer's fileFilter only sees the client-supplied (spoofable) mimetype
// header. This runs after the upload, sniffs the actual file content
// (magic bytes) via `file-type`, and rejects + deletes the file if the real
// content doesn't match what was declared.
export function verifyUploadedFileType(allowedMimeTypes) {
  return asyncHandler(async (req, res, next) => {
    if (!req.file) {
      next();
      return;
    }

    const detected = await fileTypeFromFile(req.file.path);
    if (!detected || !allowedMimeTypes.includes(detected.mime)) {
      await fs.unlink(req.file.path).catch((err) => logger.warn({ err }, 'Failed to remove rejected upload'));
      throw ApiError.badRequest('File content does not match an allowed file type');
    }

    next();
  });
}
