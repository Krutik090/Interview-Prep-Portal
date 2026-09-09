import { useState } from 'react';
import { useSubmitQuizMutation } from '../../submissions/submissionsApi.js';
import PerformanceTips from '../../submissions/PerformanceTips.jsx';

export default function QuizModuleView({ module, progress }) {
  const [answers, setAnswers] = useState({});
  const [submitQuiz, { isLoading, data, error }] = useSubmitQuizMutation();
  const alreadyDone = progress?.status === 'completed' || progress?.status === 'failed';

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = module.questions.map((_, index) => ({
      questionIndex: index,
      answerText: answers[index] ?? '',
    }));
    await submitQuiz({ moduleId: module._id, answers: payload });
  }

  const result = data?.submission;

  if (result || alreadyDone) {
    const submissionId = result?._id ?? progress?.lastAttemptSubmission;
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded border border-gray-200 p-3 text-sm dark:border-gray-800">
          <p className="font-medium">
            Score: {result?.finalScorePct ?? progress?.scorePct ?? 0}%
          </p>
          <p className="text-gray-500">Quiz already submitted for this attempt.</p>
        </div>
        {submissionId && <PerformanceTips submissionId={submissionId} />}
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      {module.questions.map((q, index) => (
        <fieldset key={index} className="flex flex-col gap-2">
          <legend className="text-sm font-medium">{q.questionText}</legend>
          {q.type === 'mcq' ? (
            q.options.map((option, optIndex) => (
              <label key={optIndex} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`q-${index}`}
                  value={optIndex}
                  checked={answers[index] === String(optIndex)}
                  onChange={() => setAnswers((prev) => ({ ...prev, [index]: String(optIndex) }))}
                />
                {option}
              </label>
            ))
          ) : (
            <input
              className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              value={answers[index] ?? ''}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [index]: e.target.value }))}
            />
          )}
        </fieldset>
      ))}
      {error && <p className="text-sm text-red-600">Could not submit quiz.</p>}
      <button
        type="submit"
        disabled={isLoading}
        className="self-start rounded bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
      >
        {isLoading ? 'Submitting...' : 'Submit quiz'}
      </button>
    </form>
  );
}
