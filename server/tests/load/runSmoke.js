/* eslint-disable no-console -- CLI script; console output is the actual deliverable here */
// Manual load smoke test — NOT run in CI/per-commit (per the testing
// strategy: load testing is a periodic manual check, not a unit/integration
// test). Boots the real app against the configured MONGO_URI/REDIS_URL
// (a running dev/staging instance, not the test DB) and hits a couple of
// representative endpoints with autocannon.
//
// Usage: npm run load-test   (from server/, with .env pointing at a real
// Mongo/Redis — see README).
//
// Important: the global rate limiter (100 req/min per IP, see
// middlewares/rateLimiters.js) applies here exactly as it would in
// production — autocannon hitting from one machine *is* one IP. That's why
// each check below uses a bounded request `amount` (well under 100) rather
// than a long duration at high concurrency: the point is to measure
// per-request latency, not to defeat the limiter that's deliberately
// protecting a single client from hogging capacity. Getting a true
// multi-client throughput number would mean running this from several
// source IPs (or temporarily raising the limit in a benchmark-only env) —
// out of scope for this lightweight smoke check.
import autocannon from 'autocannon';
import { connectDb } from '../../src/config/db.js';
import { createApp } from '../../src/app.js';

const REQUEST_AMOUNT = 50; // stays under the 100/min per-IP limiter
const CONNECTIONS = 5;

function runAutocannon(opts) {
  return new Promise((resolve, reject) => {
    autocannon({ amount: REQUEST_AMOUNT, connections: CONNECTIONS, ...opts }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

function printSummary(label, result) {
  console.log(`\n=== ${label} ===`);
  console.log(`req/sec (avg): ${result.requests.average}`);
  console.log(`latency p50/p99 (ms): ${result.latency.p50} / ${result.latency.p99}`);
  console.log(`errors: ${result.errors}, timeouts: ${result.timeouts}, non-2xx: ${result.non2xx}`);
}

async function main() {
  await connectDb();
  const app = createApp();
  const server = app.listen(0);
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}/api/v1`;

  try {
    const health = await runAutocannon({ url: `${base}/health` });
    printSummary('GET /health (no DB read)', health);

    // Give the global limiter's window room before the next burst rather
    // than immediately spending the same 100/min budget.
    await new Promise((resolve) => setTimeout(resolve, 61_000));

    const email = `loadtest-${Date.now()}@example.com`;
    const register = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'correct horse battery' }),
    }).then((r) => r.json());
    const token = register.accessToken;

    const me = await runAutocannon({
      url: `${base}/auth/me`,
      headers: { Authorization: `Bearer ${token}` },
    });
    printSummary('GET /auth/me (authenticated, DB read)', me);
  } finally {
    server.close();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
