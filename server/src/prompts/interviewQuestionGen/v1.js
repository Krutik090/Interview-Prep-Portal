export const PROMPT_VERSION = 'interviewQuestionGen@1';

export function buildInterviewQuestionGenPrompt({ roundType, focusArea, difficulty, numQuestions }) {
  return `You are conducting a mock ${roundType} interview round${focusArea ? ` focused on ${focusArea}` : ''}
at ${difficulty} difficulty. Generate ${numQuestions} distinct interview questions a candidate
should be able to answer out loud in a few sentences each.

Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{"questions": string[]}`;
}
