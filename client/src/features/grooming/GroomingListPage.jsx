import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useListGroomingQuery } from './groomingApi.js';

const CATEGORIES = ['dress_code', 'body_language', 'communication', 'presentation', 'other'];
const CATEGORY_LABELS = {
  dress_code: 'Dress code',
  body_language: 'Body language',
  communication: 'Communication',
  presentation: 'Presentation',
  other: 'Other',
};

export default function GroomingListPage() {
  const [category, setCategory] = useState('');
  const { data, isLoading } = useListGroomingQuery(category ? { category } : undefined);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Grooming & self-improvement</h1>

      <div className="flex flex-wrap gap-2">
        <button
          className={`rounded border px-3 py-1 text-sm ${category === '' ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'border-gray-300 dark:border-gray-700'}`}
          onClick={() => setCategory('')}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`rounded border px-3 py-1 text-sm ${category === c ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'border-gray-300 dark:border-gray-700'}`}
            onClick={() => setCategory(c)}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {isLoading && <p>Loading...</p>}
      <ul className="flex flex-col gap-2">
        {data?.articles.map((article) => (
          <li key={article._id} className="rounded border border-gray-200 p-3 text-sm dark:border-gray-800">
            <Link to={`/grooming/${article._id}`} className="font-medium underline">
              {article.title}
            </Link>
            <p className="text-gray-500">{CATEGORY_LABELS[article.category]}</p>
          </li>
        ))}
        {data && data.articles.length === 0 && <p className="text-gray-500">No articles published yet.</p>}
      </ul>
    </div>
  );
}
