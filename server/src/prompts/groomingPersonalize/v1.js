export const PROMPT_VERSION = 'groomingPersonalize@1';

export function buildGroomingPersonalizePrompt({ articleTitle, articleBody, profileSummary }) {
  return `A student is reading this grooming/soft-skills article:

Title: ${articleTitle}
Body: ${articleBody}

Their profile summary: ${profileSummary || 'No profile summary available yet.'}

Write one short (2-3 sentence), personalized tip applying this article's
advice to this specific student's situation.

Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{"tip": string}`;
}
