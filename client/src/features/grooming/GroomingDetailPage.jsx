import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGetGroomingQuery } from './groomingApi.js';
import { apiSlice } from '../../app/apiSlice.js';
import { useDispatch } from 'react-redux';
import { sanitizeHtml } from '../../lib/sanitizeHtml.js';

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

  if (isLoading) return <p>Loading...</p>;
  const { article } = data;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">{article.title}</h1>
      {/* Body is admin-authored rich text: sanitized server-side before storage,
          and again client-side (DOMPurify) as defense-in-depth before rendering. */}
      <div className="prose text-sm" dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.body) }} />

      <div className="rounded border border-gray-200 p-4 dark:border-gray-800">
        <button
          onClick={handlePersonalize}
          disabled={loadingTip}
          className="rounded bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
        >
          {loadingTip ? 'Personalizing...' : 'Get a tip personalized to my profile'}
        </button>
        {tip && <p className="mt-3 text-sm">{tip}</p>}
      </div>
    </div>
  );
}
