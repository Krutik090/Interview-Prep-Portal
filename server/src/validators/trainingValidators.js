import { z } from 'zod';
import { objectIdSchema } from './common.js';

const passCriteriaSchema = z
  .object({
    minOverallScorePct: z.number().min(0).max(100).optional(),
    minPerModuleScorePct: z.number().min(0).max(100).optional(),
  })
  .strict();

export const createTrainingProgramSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(5000).optional(),
    roundType: z.enum(['Aptitude', 'GD', 'Technical', 'HR']),
    passCriteria: passCriteriaSchema.optional(),
    estimatedDurationMins: z.number().int().positive().optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  })
  .strict();

export const updateTrainingProgramSchema = createTrainingProgramSchema.partial().strict();

export const publishStatusSchema = z.object({ publish: z.boolean() }).strict();

export const reorderModulesSchema = z
  .object({
    moduleOrder: z.array(objectIdSchema).min(1),
  })
  .strict();

export const trainingListQuerySchema = z
  .object({
    roundType: z.enum(['Aptitude', 'GD', 'Technical', 'HR']).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();
