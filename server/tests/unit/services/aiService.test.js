import { jest } from '@jest/globals';

const mockGenerateContent = jest.fn();
const mockRecord = jest.fn().mockResolvedValue({});

jest.unstable_mockModule('../../../src/config/geminiClient.js', () => ({
  generateContent: mockGenerateContent,
  isRateLimitError: () => false,
  isTransientError: () => true,
}));

jest.unstable_mockModule('../../../src/repositories/aiInteractionLogRepository.js', () => ({
  record: mockRecord,
}));

const { summarizeProfile } = await import('../../../src/services/aiService.js');

const onboardingAnswers = {
  targetRole: 'Backend Engineer',
  experienceLevel: 'fresher',
  currentSkills: ['Node.js', 'MongoDB'],
};

beforeEach(() => {
  mockGenerateContent.mockReset();
  mockRecord.mockClear();
});

describe('aiService.summarizeProfile', () => {
  it('returns the parsed Gemini response and logs success', async () => {
    mockGenerateContent.mockResolvedValue(
      JSON.stringify({ summary: 'Great candidate', suggestedTracks: ['Technical', 'HR'] }),
    );

    const result = await summarizeProfile({ userId: 'u1', onboardingAnswers });

    expect(result.summary).toBe('Great candidate');
    expect(result.suggestedTracks).toEqual(['Technical', 'HR']);
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'success', operation: 'profile_summary' }),
    );
  });

  it('strips markdown fences before parsing', async () => {
    mockGenerateContent.mockResolvedValue(
      '```json\n' + JSON.stringify({ summary: 'Fenced', suggestedTracks: ['HR'] }) + '\n```',
    );

    const result = await summarizeProfile({ userId: 'u1', onboardingAnswers });
    expect(result.summary).toBe('Fenced');
  });

  it('falls back to a rule-based summary when Gemini errors, and logs the failure', async () => {
    mockGenerateContent.mockRejectedValue(new Error('network down'));

    const result = await summarizeProfile({ userId: 'u1', onboardingAnswers });

    expect(result.model).toBe('rule-based-fallback');
    expect(result.summary).toEqual(expect.stringContaining('Backend Engineer'));
    expect(result.suggestedTracks.length).toBeGreaterThan(0);
    expect(mockRecord).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
  });

  it('falls back when Gemini returns malformed JSON', async () => {
    mockGenerateContent.mockResolvedValue('not json at all');

    const result = await summarizeProfile({ userId: 'u1', onboardingAnswers });
    expect(result.model).toBe('rule-based-fallback');
  });
});
