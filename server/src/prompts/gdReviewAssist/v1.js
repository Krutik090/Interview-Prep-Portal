export const PROMPT_VERSION = 'gdReviewAssist@1';

export function buildGdReviewAssistPrompt({ prompt, response }) {
  return `A candidate was given this group-discussion/video prompt: "${prompt}"

Their submitted response:
"""
${response}
"""

Draft brief reviewer notes (2-3 sentences) an admin can edit before saving,
covering clarity, structure, and relevance, plus a suggested verdict.

Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{"verdict": "pass"|"fail", "comments": string}`;
}
