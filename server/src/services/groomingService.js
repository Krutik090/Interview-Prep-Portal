import * as groomingRepository from '../repositories/groomingRepository.js';
import * as profileRepository from '../repositories/profileRepository.js';
import * as aiService from './aiService.js';
import { ApiError } from '../utils/ApiError.js';
import { redisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { sanitizeRichText } from '../utils/sanitizeRichText.js';

const PERSONALIZED_TIP_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;

export function create(adminId, data) {
  return groomingRepository.create({
    ...data,
    body: sanitizeRichText(data.body),
    createdBy: adminId,
  });
}

export async function getById(id, { includeUnpublished }) {
  const article = await groomingRepository.findById(id);
  if (!article || (!includeUnpublished && article.status !== 'published')) {
    throw ApiError.notFound('Grooming content not found');
  }
  return article;
}

export async function update(id, data) {
  const sanitized = data.body ? { ...data, body: sanitizeRichText(data.body) } : data;
  const article = await groomingRepository.updateById(id, sanitized);
  if (!article) throw ApiError.notFound('Grooming content not found');
  return article;
}

export async function setPublishStatus(id, publish) {
  const article = await groomingRepository.updateById(id, { status: publish ? 'published' : 'draft' });
  if (!article) throw ApiError.notFound('Grooming content not found');
  return article;
}

export async function remove(id) {
  const article = await groomingRepository.deleteById(id);
  if (!article) throw ApiError.notFound('Grooming content not found');
}

export function list({ category, role }) {
  return groomingRepository.list({ category, includeUnpublished: role === 'admin' });
}

export async function requestAiDraft(userId, { topic }) {
  return aiService.generateContentDraft({ userId, contentType: 'grooming_tip', topic });
}

export async function getPersonalizedTip(userId, articleId) {
  const article = await getById(articleId, { includeUnpublished: false });
  const cacheKey = `ai:groomtip:${userId}:${articleId}`;

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) return { tip: cached, cached: true };
  } catch (err) {
    logger.warn({ err }, 'Grooming tip cache read failed (non-fatal)');
  }

  const profile = await profileRepository.findByUser(userId);
  const tip = await aiService.generatePersonalizedGroomingTip({
    userId,
    articleTitle: article.title,
    articleBody: article.body,
    profileSummary: profile?.aiSummary?.text,
  });

  try {
    await redisClient.set(cacheKey, tip, 'EX', PERSONALIZED_TIP_CACHE_TTL_SECONDS);
  } catch (err) {
    logger.warn({ err }, 'Grooming tip cache write failed (non-fatal)');
  }

  return { tip, cached: false };
}
