import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL });

const CALL_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 3;

function isTransientError(err) {
  const status = err?.status ?? err?.response?.status;
  return status === undefined || status >= 500;
}

function isRateLimitError(err) {
  const status = err?.status ?? err?.response?.status;
  return status === 429;
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Gemini call timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Thin wrapper around the Gemini SDK: bounded timeout, retry/backoff only on
 * transient (5xx/network) errors, and a fast-fail on rate limiting so callers
 * can apply their own fallback instead of retry-looping against a 429.
 */
export async function generateContent(prompt) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await withTimeout(model.generateContent(prompt), CALL_TIMEOUT_MS);
      return result.response.text();
    } catch (err) {
      lastError = err;
      if (isRateLimitError(err)) {
        logger.warn({ err }, 'Gemini rate limited');
        throw err;
      }
      if (!isTransientError(err) || attempt === MAX_ATTEMPTS) {
        logger.error({ err, attempt }, 'Gemini call failed');
        throw err;
      }
      const backoffMs = 2 ** attempt * 250;
      logger.warn({ err, attempt, backoffMs }, 'Gemini call failed, retrying');
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
  throw lastError;
}

export { isRateLimitError, isTransientError };
