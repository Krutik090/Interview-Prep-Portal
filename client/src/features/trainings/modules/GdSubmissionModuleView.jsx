import { useState } from 'react';
import { Upload } from 'lucide-react';
import { useSubmitGdMutation } from '../../submissions/submissionsApi.js';
import PerformanceTips from '../../submissions/PerformanceTips.jsx';
import Button from '../../../components/ui/Button.jsx';
import { Textarea } from '../../../components/ui/Field.jsx';
import { InlineError } from '../../../components/ui/Feedback.jsx';
import { ScorePill } from '../../../components/ui/Progress.jsx';
import { StatusBadge } from '../../../components/ui/Badge.jsx';

export default function GdSubmissionModuleView({ module, progress }) {
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [submitGd, { isLoading, data, error }] = useSubmitGdMutation();

  const submission = data?.submission;
  const reviewed = progress?.status === 'completed' || progress?.status === 'failed';
  const awaitingReview = Boolean(submission) && !reviewed;

  async function handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData();
    if (module.submissionMode === 'file' && file) formData.append('file', file);
    else formData.append('text', text);
    await submitGd({ moduleId: module._id, formData });
  }

  if (reviewed || awaitingReview) {
    const submissionId = submission?._id ?? progress?.lastAttemptSubmission;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
          {reviewed ? (
            <>
              <ScorePill score={progress.scorePct} />
              <p className="text-sm text-muted">A reviewer has marked this submission.</p>
            </>
          ) : (
            <>
              <StatusBadge status="under_review" />
              <p className="text-sm text-muted">
                Submitted. A reviewer will look at it and your score will appear here.
              </p>
            </>
          )}
        </div>
        {reviewed && submissionId && <PerformanceTips submissionId={submissionId} />}
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="rounded-lg border border-line bg-surface p-4">
        <p className="text-[13px] font-medium text-muted">Prompt</p>
        <p className="mt-1 max-w-[68ch] text-sm leading-relaxed text-ink">{module.prompt}</p>
      </div>

      {module.submissionMode === 'file' ? (
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-line-strong bg-surface px-4 py-8 text-center transition-colors hover:border-brand">
          <Upload size={20} className="text-muted" aria-hidden="true" />
          <span className="text-sm font-medium text-ink">
            {file ? file.name : 'Choose a video or audio file'}
          </span>
          <span className="text-[12.5px] text-muted">
            MP4, WebM, MP3 or WAV, up to {module.maxFileSizeMB ?? 50}MB
          </span>
          <input
            type="file"
            accept="video/*,audio/*"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        </label>
      ) : (
        <Textarea
          rows={6}
          placeholder="Write your response — take a clear position and back it up"
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
        />
      )}

      {error && (
        <InlineError>
          {error.status === 400
            ? 'That file type is not accepted. Upload an MP4, WebM, MP3 or WAV file.'
            : 'Could not submit your response. Try again in a moment.'}
        </InlineError>
      )}

      <div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Submitting' : 'Submit response'}
        </Button>
      </div>
    </form>
  );
}
