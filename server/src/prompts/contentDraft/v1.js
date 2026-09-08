export const PROMPT_VERSION = 'contentDraft@1';

export function buildContentDraftPrompt({ contentType, topic, count = 5 }) {
  if (contentType === 'quiz') {
    return `Generate ${count} interview-preparation quiz questions about "${topic}".
Mix multiple-choice and short-answer questions.
Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{"questions": [{"questionText": string, "type": "mcq"|"short_answer", "options": string[] (mcq only, 4 options), "correctAnswerIndex": number (mcq only), "correctAnswerText": string (short_answer only), "points": number}]}`;
  }

  if (contentType === 'material') {
    return `Write concise, well-structured study material (300-500 words) for interview
preparation on the topic "${topic}". Use plain text with short paragraphs.
Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{"contentBody": string}`;
  }

  // grooming_tip
  return `Write a short, practical grooming/soft-skills tip (100-200 words) for
interview candidates on the topic "${topic}".
Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{"body": string}`;
}
