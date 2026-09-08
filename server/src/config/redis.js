import IORedis from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// BullMQ requires its own connection(s) with maxRetriesPerRequest: null.
// See: https://docs.bullmq.io/guide/connections
export function createRedisConnection() {
  const connection = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    // Don't connect until the first command is issued — lets modules that
    // import this file (e.g. for a store they may not end up using, as in
    // tests) avoid needing a live Redis instance just to load.
    lazyConnect: true,
    connectTimeout: 2000,
    // Retry a few times with backoff, then stop — an indefinitely-retrying
    // background reconnect loop keeps the process's event loop alive
    // forever (blocks clean shutdown/test exit) for marginal benefit, since
    // every caller already treats a Redis outage as non-fatal and falls
    // back to the database. A future request that needs Redis again will
    // simply hit the same fallback path rather than auto-recovering — an
    // acceptable trade-off for this project's scale.
    retryStrategy: (times) => (times > 5 ? null : Math.min(times * 300, 2000)),
    // Fail a command immediately (rejected promise) if not connected,
    // instead of queueing it indefinitely — every caller that talks to
    // Redis for caching/rate-limiting treats a Redis outage as non-fatal
    // and falls back to the database, which only works if the call
    // actually rejects rather than hanging.
    enableOfflineQueue: false,
  });
  connection.on('error', (err) => logger.error({ err }, 'Redis connection error'));
  return connection;
}

// Shared connection for plain caching/rate-limiting use (not BullMQ).
export const redisClient = createRedisConnection();
