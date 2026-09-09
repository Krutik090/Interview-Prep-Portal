import { useState } from 'react';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import {
  useListGroomingQuery,
  useCreateGroomingMutation,
  useDeleteGroomingMutation,
  useSetGroomingPublishStatusMutation,
  useRequestGroomingAiDraftMutation,
} from './groomingApi.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { Panel, PanelHeader } from '../../components/ui/Panel.jsx';
import Button from '../../components/ui/Button.jsx';
import { Field, Input, Select, Textarea } from '../../components/ui/Field.jsx';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import { EmptyState, InlineError, LoadingState } from '../../components/ui/Feedback.jsx';

const CATEGORIES = [
  { value: 'dress_code', label: 'Dress code' },
  { value: 'body_language', label: 'Body language' },
  { value: 'communication', label: 'Communication' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));

export default function AdminGroomingPage() {
  const { data, isLoading } = useListGroomingQuery();
  const [createGrooming, { isLoading: creating, error }] = useCreateGroomingMutation();
  const [deleteGrooming] = useDeleteGroomingMutation();
  const [setPublishStatus] = useSetGroomingPublishStatusMutation();
  const [requestAiDraft, { isLoading: drafting }] = useRequestGroomingAiDraftMutation();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', category: CATEGORIES[0].value, body: '' });
  const [topic, setTopic] = useState('');

  async function handleAiDraft() {
    const result = await requestAiDraft(topic || form.title);
    if (result.data) setForm((prev) => ({ ...prev, body: result.data.draft.body }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    const result = await createGrooming(form);
    if (!result.error) {
      setForm({ title: '', category: CATEGORIES[0].value, body: '' });
      setTopic('');
      setShowForm(false);
    }
  }

  const articles = data?.articles ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Grooming content"
        description="Short guides on presentation, communication, and interview etiquette."
        actions={
          <Button icon={Plus} onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : 'New guide'}
          </Button>
        }
      />

      {showForm && (
        <Panel className="mb-5">
          <PanelHeader title="New guide" description="Saved as a draft until you publish it." />
          <form className="flex flex-col gap-4 px-5 py-5" onSubmit={handleCreate}>
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <Field label="Title" required>
                {(a) => (
                  <Input
                    {...a}
                    placeholder="e.g. Dressing for a video interview"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    required
                  />
                )}
              </Field>
              <Field label="Category">
                {(a) => (
                  <Select
                    {...a}
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            <div className="rounded-lg border border-line bg-paper/50 p-3.5">
              <p className="text-[13px] font-medium text-ink">Draft this with AI</p>
              <p className="mt-0.5 text-[12.5px] text-muted">
                Gives you a starting point to edit before publishing.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Input
                  className="min-w-0 flex-1"
                  placeholder={`Topic (defaults to "${form.title || 'the title'}")`}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                <Button variant="secondary" icon={Sparkles} onClick={handleAiDraft} disabled={drafting}>
                  {drafting ? 'Writing' : 'Draft'}
                </Button>
              </div>
            </div>

            <Field label="Body" required hint="Basic formatting is allowed; anything unsafe is stripped on save.">
              {(a) => (
                <Textarea
                  {...a}
                  rows={8}
                  value={form.body}
                  onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                  required
                />
              )}
            </Field>

            {error && <InlineError>Could not save the guide. Check the fields and try again.</InlineError>}

            <div>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating' : 'Create guide'}
              </Button>
            </div>
          </form>
        </Panel>
      )}

      <Panel>
        <PanelHeader title={`All guides (${articles.length})`} />
        {isLoading ? (
          <LoadingState />
        ) : articles.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No guides yet"
            description="Write the first one, or start from an AI draft."
            action={
              <Button size="sm" icon={Plus} onClick={() => setShowForm(true)}>
                New guide
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {articles.map((article) => (
              <li key={article._id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{article.title}</p>
                  <p className="text-[12.5px] text-muted">{CATEGORY_LABEL[article.category]}</p>
                </div>
                <StatusBadge status={article.status} />
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setPublishStatus({ id: article._id, publish: article.status !== 'published' })
                    }
                  >
                    {article.status === 'published' ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Trash2}
                    aria-label={`Delete ${article.title}`}
                    className="text-fail hover:bg-fail-soft"
                    onClick={() => deleteGrooming(article._id)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
