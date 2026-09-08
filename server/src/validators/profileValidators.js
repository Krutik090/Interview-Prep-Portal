import { z } from 'zod';

const tagArray = z.array(z.string().trim().min(1).max(60)).max(30);

export const profileUpdateSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120).optional(),
    education: z
      .object({
        degree: z.string().trim().min(1).max(120).optional(),
        institution: z.string().trim().min(1).max(200).optional(),
        graduationYear: z.coerce.number().int().min(1950).max(2100).optional(),
        branch: z.string().trim().max(120).optional(),
      })
      .strict()
      .optional(),
    targetRole: z.string().trim().min(1).max(120).optional(),
    targetDomain: z.string().trim().max(120).optional(),
    experienceLevel: z.enum(['fresher', '0-1yr', '1-3yr', '3+yr']).optional(),
    currentSkills: tagArray.optional(),
    strengths: tagArray.optional(),
    weaknesses: tagArray.optional(),
    preferredCompanies: tagArray.optional(),
  })
  .strict();
