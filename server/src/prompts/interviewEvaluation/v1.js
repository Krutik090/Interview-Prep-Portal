export const PROMPT_VERSION = 'interviewEvaluation@1';

export function buildInterviewEvaluationPrompt({ roundType, question, answerText }) {
  return `You are grading one answer from a mock ${roundType} interview.

Question: ${question}
Candidate's answer: ${answerText || '(no answer given)'}

Judge whether this answer is adequate for a real interview. Give a score from
0-100, a pass/fail verdict (pass if score >= 60), and 1-2 sentences of
constructive feedback.

Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{"verdict": "pass"|"fail", "score": number, "feedback": string}`;
}
