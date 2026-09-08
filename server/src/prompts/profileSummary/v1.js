export const PROMPT_VERSION = 'profileSummary@1';

export function buildProfileSummaryPrompt(onboardingAnswers) {
  return `You are an assistant helping a student prepare for job interviews.
Given the student's onboarding answers below, write a concise 2-3 sentence
profile summary, and suggest which interview round tracks they should focus
on first from this fixed set: ["Aptitude","GD","Technical","HR"].

Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{"summary": string, "suggestedTracks": string[]}

Onboarding answers:
${JSON.stringify(onboardingAnswers, null, 2)}`;
}
