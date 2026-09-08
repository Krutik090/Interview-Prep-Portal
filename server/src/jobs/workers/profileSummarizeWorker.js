import { Worker } from 'bullmq';
import { createRedisConnection } from '../../config/redis.js';
import { QUEUE_NAMES } from '../queues.js';
import { logger } from '../../utils/logger.js';
import * as profileRepository from '../../repositories/profileRepository.js';
import { summarizeProfile } from '../../services/aiService.js';

export function startProfileSummarizeWorker() {
  const worker = new Worker(
    QUEUE_NAMES.AI_PROFILE,
    async (job) => {
      const { userId } = job.data;
      // Re-fetch fresh data rather than trusting the enqueue-time payload.
      const profile = await profileRepository.findByUser(userId);
      if (!profile) {
        logger.warn({ userId }, 'profile-summarize job: profile not found, skipping');
        return;
      }

      const result = await summarizeProfile({
        userId,
        onboardingAnswers: profile.onboardingAnswersRaw,
      });

      await profileRepository.updateByUser(userId, {
        aiSummary: {
          text: result.summary,
          suggestedTracks: result.suggestedTracks,
          generatedAt: result.generatedAt,
          promptVersion: result.promptVersion,
          model: result.model,
        },
      });
    },
    { connection: createRedisConnection(), concurrency: 5 },
  );

  worker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id }, 'profile-summarize job failed');
  });

  return worker;
}
