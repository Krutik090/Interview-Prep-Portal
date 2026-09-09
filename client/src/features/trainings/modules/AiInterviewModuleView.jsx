import { useState } from 'react';
import {
  useStartAiInterviewMutation,
  useGetAiInterviewQuery,
  useAnswerAiInterviewMutation,
} from '../../submissions/submissionsApi.js';
import PerformanceTips from '../../submissions/PerformanceTips.jsx';

export default function AiInterviewModuleView({ module, progress }) {
  const [submissionId, setSubmissionId] = useState(null);
  const [startAiInterview, { isLoading: starting }] = useStartAiInterviewMutation();
  const [answerAiInterview, { isLoading: answering }] = useAnswerAiInterviewMutation();
  const [answers, setAnswers] = useState([]);

  const { data } = useGetAiInterviewQuery(submissionId, {
    skip: !submissionId,
    pollingInterval: 2000,
  });
  const submission = data?.submission;
  const stillProcessing =
    submission && (!submission.questionsReady || (submission.status === 'under_review' && !submission.finalScorePct));

  async function handleStart() {
    const result = await startAiInterview(module._id);
    if (result.data) setSubmissionId(result.data.submission._id);
  }

  async function handleAnswerSubmit(e) {
    e.preventDefault();
    await answerAiInterview({ submissionId, answers });
  }

  if (progress?.status === 'completed' || progress?.status === 'failed') {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded border border-gray-200 p-3 text-sm dark:border-gray-800">
          <p className="font-medium">Score: {progress.scorePct}%</p>
          <p className="text-gray-500">Mock interview already completed.</p>
        </div>
        {progress.lastAttemptSubmission && <PerformanceTips submissionId={progress.lastAttemptSubmission} />}
      </div>
    );
  }

  if (!submissionId) {
    return (
      <button
        onClick={handleStart}
        disabled={starting}
        className="self-start rounded bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
      >
        {starting ? 'Starting...' : 'Start mock interview'}
      </button>
    );
  }

  if (!submission || !submission.questionsReady) {
    return <p className="text-sm text-gray-500">Generating interview questions...</p>;
  }

  if (submission.status === 'graded') {
    return (
      <div className="flex flex-col gap-3 text-sm">
        <p className="font-medium">Final score: {submission.finalScorePct}%</p>
        {submission.interviewQA.map((qa, i) => (
          <div key={i} className="rounded border border-gray-200 p-3 dark:border-gray-800">
            <p className="font-medium">{qa.question}</p>
            <p className="text-gray-500">Your answer: {qa.answerText}</p>
            <p>
              {qa.aiEvaluation?.verdict === 'pass' ? '✓' : '✕'} {qa.aiEvaluation?.feedback}
            </p>
          </div>
        ))}
        <PerformanceTips submissionId={submission._id} />
      </div>
    );
  }

  if (submission.status === 'under_review') {
    return <p className="text-sm text-gray-500">Evaluating your answers...</p>;
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleAnswerSubmit}>
      {submission.interviewQA.map((qa, i) => (
        <label key={i} className="flex flex-col gap-1 text-sm">
          {qa.question}
          <textarea
            className="min-h-20 rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
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
        </label>
      ))}
      <button
        type="submit"
        disabled={answering || stillProcessing}
        className="self-start rounded bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
      >
        {answering ? 'Submitting...' : 'Submit answers'}
      </button>
    </form>
  );
}
