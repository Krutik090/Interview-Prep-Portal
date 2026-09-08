// Worker process entrypoint. Run separately from the API process
// (`npm run worker`) so a heavy job (e.g. Puppeteer PDF rendering) can never
// block request handling. Individual workers are registered here as each
// phase introduces them (Phase 1+: profile-summarize, interview-*, resume, tips).
import { logger } from '../utils/logger.js';
import { connectDb } from '../config/db.js';

async function main() {
  await connectDb();
  logger.info('Worker process started (no workers registered yet)');
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start worker process');
  process.exit(1);
});
