import { useState } from 'react';
import { useSubmitGdMutation } from '../../submissions/submissionsApi.js';
import PerformanceTips from '../../submissions/PerformanceTips.jsx';

export default function GdSubmissionModuleView({ module, progress }) {
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [submitGd, { isLoading, data, error }] = useSubmitGdMutation();

  async function handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData();
    if (module.submissionMode === 'file' && file) {
      formData.append('file', file);
    } else {
      formData.append('text', text);
    }
    await submitGd({ moduleId: module._id, formData });
  }

  const submission = data?.submission;
  const done = progress?.status === 'completed' || progress?.status === 'failed' || submission;

  if (done) {
    const submissionId = submission?._id ?? progress?.lastAttemptSubmission;
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded border border-gray-200 p-3 text-sm dark:border-gray-800">
          <p className="font-medium">
            {progress?.scorePct != null ? `Score: ${progress.scorePct}%` : 'Submitted — awaiting review.'}
          </p>
        </div>
        {submissionId && <PerformanceTips submissionId={submissionId} />}
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <p className="text-sm">{module.prompt}</p>
      {module.submissionMode === 'file' ? (
        <input
          type="file"
          accept="video/*,audio/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
        />
      ) : (
        <textarea
          className="min-h-24 rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
        />
      )}
      {error && <p className="text-sm text-red-600">Could not submit.</p>}
      <button
        type="submit"
        disabled={isLoading}
        className="self-start rounded bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
      >
        {isLoading ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
