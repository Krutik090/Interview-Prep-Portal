import * as trainingProgramRepository from '../repositories/trainingProgramRepository.js';
import { ApiError } from '../utils/ApiError.js';
import { redisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';

const CATALOG_CACHE_TTL_SECONDS = 5 * 60;

function catalogCacheKey({ roundType, page }) {
  return `catalog:programs:${roundType ?? 'all'}:${page ?? 1}`;
}

async function invalidateCatalogCache() {
  try {
    const keys = await redisClient.keys('catalog:programs:*');
    if (keys.length) await redisClient.del(...keys);
  } catch (err) {
    logger.warn({ err }, 'Failed to invalidate catalog cache (non-fatal)');
  }
}

export async function create(adminId, data) {
  const program = await trainingProgramRepository.create({ ...data, createdBy: adminId });
  await invalidateCatalogCache();
  return program;
}

export async function getById(id, { role } = {}) {
  const program = await trainingProgramRepository.findById(id);
  if (!program) throw ApiError.notFound('Training program not found');
  if (role !== 'admin' && program.status !== 'published') {
    // Mirrors moduleService.getByIdForRole: a student must not be able to
    // fetch a draft/archived program's details by guessing/enumerating its
    // id, even though the list endpoint already filters it out.
    throw ApiError.notFound('Training program not found');
  }
  return program;
}

export async function update(id, data) {
  const program = await trainingProgramRepository.updateById(id, data);
  if (!program) throw ApiError.notFound('Training program not found');
  await invalidateCatalogCache();
  return program;
}

export async function remove(id) {
  // Phase 3 (once Enrollment exists) should refuse deletion when active
  // enrollments reference this program, and archive instead.
  const program = await trainingProgramRepository.deleteById(id);
  if (!program) throw ApiError.notFound('Training program not found');
  await invalidateCatalogCache();
}

export async function setPublishStatus(id, publish) {
  const update = publish
    ? { status: 'published', publishedAt: new Date() }
    : { status: 'draft', publishedAt: null };
  const program = await trainingProgramRepository.updateById(id, update);
  if (!program) throw ApiError.notFound('Training program not found');
  await invalidateCatalogCache();
  return program;
}

export function listForAdmin(filters) {
  return trainingProgramRepository.list(filters);
}

export async function listPublishedForStudents({ roundType, page = 1, limit = 20 } = {}) {
  const cacheKey = catalogCacheKey({ roundType, page });
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    logger.warn({ err }, 'Catalog cache read failed (non-fatal), falling back to DB');
  }

  const programs = await trainingProgramRepository.list({ roundType, status: 'published', page, limit });

  try {
    await redisClient.set(cacheKey, JSON.stringify(programs), 'EX', CATALOG_CACHE_TTL_SECONDS);
  } catch (err) {
    logger.warn({ err }, 'Catalog cache write failed (non-fatal)');
  }

  return programs;
}

export async function reorderModules(programId, moduleOrder) {
  // Admin-only route (enforced at the route level) — a draft program must
  // still be reorderable by the admin who owns it.
  const program = await getById(programId, { role: 'admin' });
  const currentIds = program.moduleOrder.map((id) => String(id));
  const sameSet =
    currentIds.length === moduleOrder.length &&
    currentIds.every((id) => moduleOrder.includes(id));
  if (!sameSet) {
    throw ApiError.badRequest('moduleOrder must contain exactly the program\'s existing module ids');
  }
  return trainingProgramRepository.setModuleOrder(programId, moduleOrder);
}
