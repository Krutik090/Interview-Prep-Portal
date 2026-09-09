import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shirt, Sparkles, Presentation, MessageCircle, Eye } from 'lucide-react';
import { useListGroomingQuery } from './groomingApi.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { Panel } from '../../components/ui/Panel.jsx';
import { EmptyState, LoadingState } from '../../components/ui/Feedback.jsx';

const CATEGORIES = [
  { key: 'dress_code', label: 'Dress code', icon: Shirt },
  { key: 'body_language', label: 'Body language', icon: Eye },
  { key: 'communication', label: 'Communication', icon: MessageCircle },
  { key: 'presentation', label: 'Presentation', icon: Presentation },
  { key: 'other', label: 'Other', icon: Sparkles },
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));

export default function GroomingListPage() {
  const [category, setCategory] = useState('');
  const { data, isLoading } = useListGroomingQuery(category ? { category } : undefined);
  const articles = data?.articles ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Grooming guides"
        description="How to present yourself on the day — what to wear, how to speak, and what interviewers read from body language."
      />

      <div className="mb-5 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setCategory('')}
          className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${
            category === ''
              ? 'border-brand bg-brand text-white'
              : 'border-line-strong bg-surface text-muted hover:text-ink'
          }`}
        >
          Everything
        </button>
        {CATEGORIES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setCategory(key)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${
              category === key
                ? 'border-brand bg-brand text-white'
                : 'border-line-strong bg-surface text-muted hover:text-ink'
            }`}
          >
            <Icon size={14} strokeWidth={1.9} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingState label="Loading guides" />
      ) : articles.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Sparkles}
            title="No guides here yet"
            description="Your placement cell publishes these. Check another category, or come back later."
          />
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => {
            const meta = CATEGORY_MAP[article.category] ?? CATEGORY_MAP.other;
            const Icon = meta.icon;
            return (
              <Link
                key={article._id}
                to={`/grooming/${article._id}`}
                className="group flex flex-col rounded-xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(20,22,31,0.04)] transition-colors hover:border-line-strong"
              >
                <span className="mb-3.5 flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
                </span>
                <h2 className="font-display text-[15.5px] font-semibold leading-snug text-ink group-hover:underline">
                  {article.title}
                </h2>
                <p className="mt-1.5 text-[12.5px] text-muted">{meta.label}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
