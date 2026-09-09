export const PROMPT_VERSION = 'resumePolish@1';

export function buildResumePolishPrompt({ profileSnapshot, completedPrograms }) {
  return `Write polished resume content for a candidate with this profile:

Target role: ${profileSnapshot.targetRole}
Experience level: ${profileSnapshot.experienceLevel}
Skills: ${(profileSnapshot.currentSkills ?? []).join(', ')}
Strengths: ${(profileSnapshot.strengths ?? []).join(', ')}

They have passed these interview-prep training programs:
${completedPrograms.map((p) => `- ${p.title} (${p.roundType}), scored ${p.scorePct}%`).join('\n')}

Write a resume summary (2-3 sentences), a skills list, a short projects/
experience section (bullet points, invent nothing false — infer only from
the skills/programs given), and an achievements section (bullet points
referencing the completed programs).

Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{"summary": string, "skillsSection": string[], "projectsSection": string[], "achievementsSection": string[]}`;
}
