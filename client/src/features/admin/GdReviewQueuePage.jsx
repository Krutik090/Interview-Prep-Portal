import { useState } from 'react';
import { Check, MessagesSquare, Paperclip, Sparkles, X } from 'lucide-react';
import {
  useListGdQueueQuery,
  useReviewGdMutation,
  useRequestGdAiAssistMutation,
} from '../submissions/submissionsApi.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { Panel } from '../../components/ui/Panel.jsx';
import Button from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Textarea } from '../../components/ui/Field.jsx';
import { EmptyState, InlineError, LoadingState } from '../../components/ui/Feedback.jsx';

export default function GdReviewQueuePage() {
  const { data, isLoading } = useListGdQueueQuery();
  const [reviewGd, { isLoading: saving }] = useReviewGdMutation();
  const [requestGdAiAssist] = useRequestGdAiAssistMutation();
  const [comments, setComments] = useState({});
  const [suggestions, setSuggestions] = useState({});
  const [draftingId, setDraftingId] = useState(null);
  const [errorId, setErrorId] = useState(null);

  async function handleAiAssist(submissionId) {
    setDraftingId(submissionId);
    setErrorId(null);
    const result = await requestGdAiAssist(submissionId);
    setDraftingId(null);
    if (result.error) {
      setErrorId(submissionId);
      return;
    }
    setSuggestions((prev) => ({ ...prev, [submissionId]: result.data.draft }));
    setComments((prev) => ({ ...prev, [submissionId]: result.data.draft.comments }));
  }

  async function handleReview(submissionId, verdict) {
    await reviewGd({
      submissionId,
      verdict,
      comments: comments[submissionId]?.trim() || 'Reviewed.',
    });
  }

  if (isLoading) return <LoadingState label="Loading queue" />;

  const submissions = data.submissions;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Submission queue"
        description="Written and recorded responses waiting on a pass or fail verdict."
      />

      {submissions.length === 0 ? (
        <Panel>
          <EmptyState
            icon={MessagesSquare}
            title="Nothing waiting"
            description="When students submit a written or recorded response, it lands here for review."
          />
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          {submissions.map((submission) => {
            const suggestion = suggestions[submission._id];
            return (
              <Panel key={submission._id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink">{submission.student?.email}</p>
                  <span className="text-[12.5px] text-muted">
                    Submitted {new Date(submission.submittedAt).toLocaleDateString()}
                  </span>
                </div>

                {submission.gdTextResponse && (
                  <blockquote className="mt-3 max-w-[68ch] border-l-2 border-line-strong pl-3.5 text-[13.5px] leading-relaxed text-ink/80">
                    {submission.gdTextResponse}
                  </blockquote>
                )}

                {submission.gdFilePath && (
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-paper px-3 py-2 text-[13px] text-muted">
                    <Paperclip size={14} aria-hidden="true" />
                    {submission.gdFilePath.split(/[\\/]/).pop()}
                  </p>
                )}

                <div className="mt-4">
                  <label
                    className="text-[13px] font-medium text-ink"
                    htmlFor={`comments-${submission._id}`}
                  >
                    Your feedback
                  </label>
                  <div className="mt-1.5">
                    <Textarea
                      id={`comments-${submission._id}`}
                      rows={3}
                      placeholder="What did they do well, and what should they change next time?"
                      value={comments[submission._id] ?? ''}
                      onChange={(e) =>
                        setComments((prev) => ({ ...prev, [submission._id]: e.target.value }))
                      }
                    />
                  </div>
                  {suggestion && (
                    <p className="mt-2 text-[12.5px] text-muted">
                      Drafted with AI — suggested verdict{' '}
                      <Badge tone={suggestion.verdict === 'pass' ? 'pass' : 'fail'}>
                        {suggestion.verdict === 'pass' ? 'Pass' : 'Fail'}
                      </Badge>
                      . Edit it before saving.
                    </p>
                  )}
                </div>

                {errorId === submission._id && (
                  <div className="mt-3">
                    <InlineError>Could not draft feedback. Write it manually or try again.</InlineError>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                  <Button
                    variant="success"
                    icon={Check}
                    disabled={saving}
                    onClick={() => handleReview(submission._id, 'pass')}
                  >
                    Pass
                  </Button>
                  <Button
                    variant="danger"
                    icon={X}
                    disabled={saving}
                    onClick={() => handleReview(submission._id, 'fail')}
                  >
                    Fail
                  </Button>
                  <Button
                    variant="ghost"
                    icon={Sparkles}
                    className="ml-auto"
                    disabled={draftingId === submission._id}
                    onClick={() => handleAiAssist(submission._id)}
                  >
                    {draftingId === submission._id ? 'Drafting' : 'Draft feedback'}
                  </Button>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
