import { useState } from 'react';
import {
  useListGroomingQuery,
  useCreateGroomingMutation,
  useDeleteGroomingMutation,
  useSetGroomingPublishStatusMutation,
  useRequestGroomingAiDraftMutation,
} from './groomingApi.js';

const CATEGORIES = ['dress_code', 'body_language', 'communication', 'presentation', 'other'];

export default function AdminGroomingPage() {
  const { data, isLoading } = useListGroomingQuery();
  const [createGrooming, { isLoading: creating }] = useCreateGroomingMutation();
  const [deleteGrooming] = useDeleteGroomingMutation();
  const [setPublishStatus] = useSetGroomingPublishStatusMutation();
  const [requestAiDraft, { isLoading: drafting }] = useRequestGroomingAiDraftMutation();
  const [form, setForm] = useState({ title: '', category: CATEGORIES[0], body: '' });
  const [topic, setTopic] = useState('');

  async function handleAiDraft() {
    const result = await requestAiDraft(topic || form.title);
    if (result.data) setForm((prev) => ({ ...prev, body: result.data.draft.body }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    const result = await createGrooming(form);
    if (!result.error) setForm({ title: '', category: CATEGORIES[0], body: '' });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Grooming content</h1>

      <form className="flex flex-col gap-3 rounded border border-gray-200 p-4 dark:border-gray-800" onSubmit={handleCreate}>
        <input
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          required
        />
        <select
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          value={form.category}
          onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            placeholder="AI draft topic (optional, defaults to title)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <button type="button" disabled={drafting} onClick={handleAiDraft} className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 disabled:opacity-50">
            {drafting ? 'Drafting...' : 'AI draft'}
          </button>
        </div>
        <textarea
          className="min-h-32 rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          placeholder="Body"
          value={form.body}
          onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
          required
        />
        <button
          type="submit"
          disabled={creating}
          className="self-start rounded bg-gray-900 px-3 py-2 text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
        >
          {creating ? 'Creating...' : 'Create'}
        </button>
      </form>

      {isLoading && <p>Loading...</p>}
      <ul className="flex flex-col gap-2">
        {data?.articles.map((article) => (
          <li key={article._id} className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800">
            <span>
              {article.title} <span className="text-gray-500">({article.category}, {article.status})</span>
            </span>
            <span className="flex gap-2">
              <button
                className="underline"
                onClick={() => setPublishStatus({ id: article._id, publish: article.status !== 'published' })}
              >
                {article.status === 'published' ? 'Unpublish' : 'Publish'}
              </button>
              <button className="text-red-600 underline" onClick={() => deleteGrooming(article._id)}>
                Delete
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
