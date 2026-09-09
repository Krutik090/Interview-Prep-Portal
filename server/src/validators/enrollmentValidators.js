import { z } from 'zod';
import { objectIdSchema } from './common.js';

export const enrollSchema = z.object({ programId: objectIdSchema }).strict();
