import { z } from 'zod';

const tagArray = z.array(z.string().trim().min(1).max(60)).max(30).default([]);

export const onboardingSubmitSchema = z
  .object({
    education: z
      .object({
        degree: z.string().trim().min(1).max(120),
        institution: z.string().trim().min(1).max(200),
        graduationYear: z.coerce.number().int().min(1950).max(2100),
        branch: z.string().trim().max(120).optional(),
      })
      .strict(),
    targetRole: z.string().trim().min(1).max(120),
    targetDomain: z.string().trim().max(120).optional(),
    experienceLevel: z.enum(['fresher', '0-1yr', '1-3yr', '3+yr']),
    currentSkills: tagArray,
    strengths: tagArray,
    weaknesses: tagArray,
    preferredCompanies: tagArray,
  })
  .strict();
