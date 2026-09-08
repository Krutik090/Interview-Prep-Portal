import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';

export const QUEUE_NAMES = {
  AI_PROFILE: 'ai-profile',
  AI_INTERVIEW: 'ai-interview',
  AI_CONTENT: 'ai-content',
  AI_RESUME: 'ai-resume',
  AI_TIPS: 'ai-tips',
};

const connection = createRedisConnection();

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { age: 24 * 60 * 60 },
  removeOnFail: { age: 7 * 24 * 60 * 60 },
};

const queues = new Map();

export function getQueue(name) {
  if (!queues.has(name)) {
    queues.set(name, new Queue(name, { connection, defaultJobOptions }));
  }
  return queues.get(name);
}
