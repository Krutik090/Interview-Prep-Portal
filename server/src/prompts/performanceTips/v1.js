export const PROMPT_VERSION = 'performanceTips@1';

export function buildPerformanceTipsPrompt({ moduleType, roundType, scorePct, details }) {
  return `A student just completed a ${moduleType} module in a ${roundType} interview-prep
track, scoring ${scorePct}%.

Details of their attempt:
${details}

Give 2-3 short, specific, actionable tips to help them improve next time.
Be encouraging but concrete.

Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{"tips": string}`;
}
