import { useState } from 'react';
import {
  useListGdQueueQuery,
  useReviewGdMutation,
  useRequestGdAiAssistMutation,
} from '../../features/submissions/submissionsApi.js';

export default function GdReviewQueuePage() {
  const { data, isLoading } = useListGdQueueQuery();
  const [reviewGd] = useReviewGdMutation();
  const [requestGdAiAssist, { isLoading: drafting }] = useRequestGdAiAssistMutation();
  const [comments, setComments] = useState({});
  const [drafts, setDrafts] = useState({});

  async function handleAiAssist(submissionId) {
    const result = await requestGdAiAssist(submissionId);
    if (result.data) {
      setDrafts((prev) => ({ ...prev, [submissionId]: result.data.draft }));
      setComments((prev) => ({ ...prev, [submissionId]: result.data.draft.comments }));
    }
  }

  async function handleReview(submissionId, verdict) {
    await reviewGd({ submissionId, verdict, comments: comments[submissionId] || '(no comments)' });
  }

  if (isLoading) return <p>Loading...</p>;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">GD / video review queue</h1>
      {data.submissions.length === 0 && <p className="text-sm text-gray-500">Nothing pending review.</p>}
      <ul className="flex flex-col gap-3">
        {data.submissions.map((submission) => (
          <li key={submission._id} className="rounded border border-gray-200 p-4 dark:border-gray-800">
            <p className="text-sm text-gray-500">Student: {submission.student?.email}</p>
            {submission.gdTextResponse && <p className="mt-2 text-sm">{submission.gdTextResponse}</p>}
            {submission.gdFilePath && <p className="mt-2 text-sm">File attached: {submission.gdFilePath}</p>}

            <div className="mt-3 flex flex-col gap-2">
              <textarea
                className="min-h-20 rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                placeholder="Review comments"
                value={comments[submission._id] ?? ''}
                onChange={(e) => setComments((prev) => ({ ...prev, [submission._id]: e.target.value }))}
              />
              {drafts[submission._id] && (
                <p className="text-xs text-gray-500">
                  AI-suggested verdict: {drafts[submission._id].verdict}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={drafting}
                  onClick={() => handleAiAssist(submission._id)}
                  className="rounded border border-gray-300 px-3 py-1 text-sm dark:border-gray-700"
                >
                  {drafting ? 'Drafting...' : 'AI-assist draft'}
                </button>
                <button
                  type="button"
                  onClick={() => handleReview(submission._id, 'pass')}
                  className="rounded bg-gray-900 px-3 py-1 text-sm text-white dark:bg-gray-100 dark:text-gray-900"
                >
                  Pass
                </button>
                <button
                  type="button"
                  onClick={() => handleReview(submission._id, 'fail')}
                  className="rounded border border-red-300 px-3 py-1 text-sm text-red-600"
                >
                  Fail
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
