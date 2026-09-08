import path from 'node:path';
import multer from 'multer';
import { env } from './env.js';

// Storage destinations and mimetype allowlists are configured per-upload-context
// (avatar/gd-submission/material-asset) when those routes are built in later
// phases. This factory centralizes the shared safety rules: bounded file size
// and a strict extension/mimetype allowlist (still re-verified against actual
// file content server-side before trusting it — client-supplied mimetype is
// spoofable).
export function createUploadMiddleware({ subdir, allowedMimeTypes, maxFileSizeMB }) {
  const destination = path.join(process.cwd(), env.STORAGE_ROOT, subdir);

  const storage = multer.diskStorage({
    destination,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      cb(null, safeName);
    },
  });

  return multer({
    storage,
    limits: { fileSize: maxFileSizeMB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        cb(new Error(`Unsupported file type: ${file.mimetype}`));
        return;
      }
      cb(null, true);
    },
  });
}
