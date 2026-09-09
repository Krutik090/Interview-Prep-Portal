import { useState } from 'react';
import { useSubmitQuizMutation } from '../../submissions/submissionsApi.js';
import PerformanceTips from '../../submissions/PerformanceTips.jsx';
import Button from '../../../components/ui/Button.jsx';
import { Textarea } from '../../../components/ui/Field.jsx';
import { InlineError } from '../../../components/ui/Feedback.jsx';
import { ScorePill } from '../../../components/ui/Progress.jsx';

export default function QuizModuleView({ module, progress }) {
  const [answers, setAnswers] = useState({});
  const [submitQuiz, { isLoading, data, error }] = useSubmitQuizMutation();
  const alreadyDone = progress?.status === 'completed' || progress?.status === 'failed';
  const result = data?.submission;

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = module.questions.map((_, index) => ({
      questionIndex: index,
      answerText: answers[index] ?? '',
    }));
    await submitQuiz({ moduleId: module._id, answers: payload });
  }

  if (result || alreadyDone) {
    const submissionId = result?._id ?? progress?.lastAttemptSubmission;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
          <ScorePill score={result?.finalScorePct ?? progress?.scorePct ?? 0} />
          <p className="text-sm text-muted">
            You&apos;ve already submitted this quiz. Your score counts toward the program average.
          </p>
        </div>
        {submissionId && <PerformanceTips submissionId={submissionId} />}
      </div>
    );
  }

  const answeredCount = module.questions.filter((_, i) => (answers[i] ?? '').length > 0).length;

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <p className="text-[13px] text-muted">
        {answeredCount} of {module.questions.length} answered
      </p>

      {module.questions.map((q, index) => (
        <fieldset key={index} className="rounded-lg border border-line bg-surface p-4">
          <legend className="px-1 text-sm font-medium text-ink">
            <span className="tabular-nums text-muted">{index + 1}.</span> {q.questionText}
          </legend>

          {q.type === 'mcq' ? (
            <div className="mt-3 flex flex-col gap-1.5">
              {q.options.map((option, optIndex) => {
                const selected = answers[index] === String(optIndex);
                return (
                  <label
                    key={optIndex}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                      selected
                        ? 'border-brand bg-brand-soft text-ink'
                        : 'border-line hover:border-line-strong'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${module._id}-${index}`}
                      value={optIndex}
                      checked={selected}
                      onChange={() => setAnswers((prev) => ({ ...prev, [index]: String(optIndex) }))}
                      className="size-4 accent-brand"
                    />
                    {option}
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="mt-3">
              <Textarea
                rows={2}
                placeholder="Type your answer"
                value={answers[index] ?? ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [index]: e.target.value }))}
              />
            </div>
          )}
        </fieldset>
      ))}

      {error && <InlineError>Could not submit the quiz. Check your connection and try again.</InlineError>}

      <div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Submitting' : 'Submit quiz'}
        </Button>
      </div>
    </form>
  );
}
