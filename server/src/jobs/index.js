// Worker process entrypoint. Run separately from the API process
// (`npm run worker`) so a heavy job (e.g. Puppeteer PDF rendering) can never
// block request handling. Individual workers are registered here as each
// phase introduces them (Phase 1+: profile-summarize, interview-*, resume, tips).
import { logger } from '../utils/logger.js';
import { connectDb } from '../config/db.js';
import { startProfileSummarizeWorker } from './workers/profileSummarizeWorker.js';
import { startInterviewWorker } from './workers/interviewWorker.js';
import { startPerformanceTipsWorker } from './workers/performanceTipsWorker.js';

async function main() {
  await connectDb();
  startProfileSummarizeWorker();
  startInterviewWorker();
  startPerformanceTipsWorker();
  logger.info('Worker process started: ai-profile, ai-interview, ai-tips');
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start worker process');
  process.exit(1);
});
