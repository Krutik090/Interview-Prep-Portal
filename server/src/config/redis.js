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
    retryStrategy: (times) => Math.min(times * 500, 5000),
  });
  connection.on('error', (err) => logger.error({ err }, 'Redis connection error'));
  return connection;
}

// Shared connection for plain caching/rate-limiting use (not BullMQ).
export const redisClient = createRedisConnection();
