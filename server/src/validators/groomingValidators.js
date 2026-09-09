import { z } from 'zod';

export const createGroomingSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    category: z.enum(['dress_code', 'body_language', 'communication', 'presentation', 'other']),
    body: z.string().trim().min(1).max(20000),
  })
  .strict();

export const updateGroomingSchema = createGroomingSchema.partial().strict();

export const publishGroomingSchema = z.object({ publish: z.boolean() }).strict();

export const groomingAiDraftSchema = z.object({ topic: z.string().trim().min(1).max(200) }).strict();

export const groomingListQuerySchema = z
  .object({
    category: z.enum(['dress_code', 'body_language', 'communication', 'presentation', 'other']).optional(),
  })
  .strict();
