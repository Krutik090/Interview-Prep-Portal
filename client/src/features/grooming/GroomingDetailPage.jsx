import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { useGetGroomingQuery } from './groomingApi.js';
import { apiSlice } from '../../app/apiSlice.js';
import { sanitizeHtml } from '../../lib/sanitizeHtml.js';
import { Panel } from '../../components/ui/Panel.jsx';
import Button from '../../components/ui/Button.jsx';
import { LoadingState, Spinner } from '../../components/ui/Feedback.jsx';

export default function GroomingDetailPage() {
  const { id } = useParams();
  const { data, isLoading } = useGetGroomingQuery(id);
  const [tip, setTip] = useState(null);
  const [loadingTip, setLoadingTip] = useState(false);
  const dispatch = useDispatch();

  async function handlePersonalize() {
    setLoadingTip(true);
    try {
      const result = await dispatch(
        apiSlice.endpoints.getPersonalizedTip.initiate(id, { forceRefetch: true }),
      ).unwrap();
      setTip(result.tip);
    } finally {
      setLoadingTip(false);
    }
  }

  if (isLoading) return <LoadingState />;
  const { article } = data;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/grooming"
        className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink"
      >
        <ChevronLeft size={15} aria-hidden="true" />
        All guides
      </Link>

      <article>
        <h1 className="font-display text-[28px] font-semibold leading-tight">{article.title}</h1>
        {/* Sanitized server-side before storage, and again here before rendering. */}
        <div
          className="mt-5 max-w-[68ch] text-[15px] leading-[1.7] text-ink/85 [&_a]:text-brand [&_a]:underline [&_li]:mb-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.body) }}
        />
      </article>

      <Panel className="mt-8 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-[52ch]">
            <h2 className="text-[15px] font-semibold">Apply this to your own situation</h2>
            <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
              Get a version of this advice written around the role you&apos;re targeting and what you
              told us during setup.
            </p>
          </div>
          <Button icon={Sparkles} onClick={handlePersonalize} disabled={loadingTip}>
            {loadingTip ? 'Writing' : 'Personalize'}
          </Button>
        </div>

        {loadingTip && !tip && (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted">
            <Spinner /> Writing your version
          </p>
        )}

        {tip && (
          <p className="mt-4 max-w-[68ch] rounded-lg bg-brand-soft px-4 py-3 text-[13.5px] leading-relaxed text-ink/85">
            {tip}
          </p>
        )}
      </Panel>
    </div>
  );
}
