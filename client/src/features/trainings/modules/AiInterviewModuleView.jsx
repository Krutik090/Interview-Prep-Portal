import { useState } from 'react';
import { Check, Mic, X } from 'lucide-react';
import {
  useStartAiInterviewMutation,
  useGetAiInterviewQuery,
  useAnswerAiInterviewMutation,
} from '../../submissions/submissionsApi.js';
import PerformanceTips from '../../submissions/PerformanceTips.jsx';
import Button from '../../../components/ui/Button.jsx';
import { Textarea } from '../../../components/ui/Field.jsx';
import { Spinner } from '../../../components/ui/Feedback.jsx';
import { ScorePill } from '../../../components/ui/Progress.jsx';

function Waiting({ label }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-4 py-3.5 text-sm text-muted">
      <Spinner />
      {label}
    </div>
  );
}

export default function AiInterviewModuleView({ module, progress }) {
  const [submissionId, setSubmissionId] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [startAiInterview, { isLoading: starting }] = useStartAiInterviewMutation();
  const [answerAiInterview, { isLoading: answering }] = useAnswerAiInterviewMutation();

  const { data } = useGetAiInterviewQuery(submissionId, {
    skip: !submissionId,
    pollingInterval: 2000,
  });
  const submission = data?.submission;

  async function handleStart() {
    const result = await startAiInterview(module._id);
    if (result.data) setSubmissionId(result.data.submission._id);
  }

  if (progress?.status === 'completed' || progress?.status === 'failed') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
          <ScorePill score={progress.scorePct} />
          <p className="text-sm text-muted">You&apos;ve already completed this mock interview.</p>
        </div>
        {progress.lastAttemptSubmission && (
          <PerformanceTips submissionId={progress.lastAttemptSubmission} />
        )}
      </div>
    );
  }

  if (!submissionId) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="max-w-[60ch] text-sm leading-relaxed text-muted">
          You&apos;ll get {module.numQuestions} questions
          {module.focusArea ? ` on ${module.focusArea}` : ''}. Answer them in your own words — each
          answer is scored with written feedback.
        </p>
        <Button icon={Mic} onClick={handleStart} disabled={starting}>
          {starting ? 'Preparing questions' : 'Start mock interview'}
        </Button>
      </div>
    );
  }

  if (!submission || !submission.questionsReady) {
    return <Waiting label="Writing your interview questions" />;
  }

  if (submission.status === 'under_review') {
    return <Waiting label="Reviewing your answers" />;
  }

  if (submission.status === 'graded') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
          <ScorePill score={submission.finalScorePct} />
          <p className="text-sm text-muted">Feedback on each answer is below.</p>
        </div>

        <ol className="flex flex-col gap-3">
          {submission.interviewQA.map((qa, i) => {
            const passed = qa.aiEvaluation?.verdict === 'pass';
            return (
              <li key={i} className="rounded-lg border border-line bg-surface p-4">
                <p className="text-sm font-medium text-ink">
                  <span className="tabular-nums text-muted">{i + 1}.</span> {qa.question}
                </p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{qa.answerText}</p>
                <p
                  className={`mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-[13px] leading-relaxed ${
                    passed ? 'bg-pass-soft text-pass' : 'bg-fail-soft text-fail'
                  }`}
                >
                  {passed ? (
                    <Check size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <X size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                  )}
                  {qa.aiEvaluation?.feedback}
                </p>
              </li>
            );
          })}
        </ol>

        <PerformanceTips submissionId={submission._id} />
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await answerAiInterview({ submissionId, answers });
      }}
    >
      {submission.interviewQA.map((qa, i) => (
        <div key={i} className="rounded-lg border border-line bg-surface p-4">
          <label className="block text-sm font-medium text-ink" htmlFor={`ans-${i}`}>
            <span className="tabular-nums text-muted">{i + 1}.</span> {qa.question}
          </label>
          <div className="mt-2.5">
            <Textarea
              id={`ans-${i}`}
              rows={3}
              placeholder="Answer as you would out loud, in a few sentences"
              value={answers[i] ?? ''}
              onChange={(e) =>
                setAnswers((prev) => {
                  const next = [...prev];
                  next[i] = e.target.value;
                  return next;
                })
              }
              required
            />
          </div>
        </div>
      ))}

      <div>
        <Button type="submit" disabled={answering}>
          {answering ? 'Submitting' : 'Submit answers'}
        </Button>
      </div>
    </form>
  );
}
