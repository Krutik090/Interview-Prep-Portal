import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useListTrainingsQuery } from './trainingsApi.js';

const ROUND_TYPES = ['Aptitude', 'GD', 'Technical', 'HR'];

export default function TrainingCatalogPage() {
  const [roundType, setRoundType] = useState('');
  const { data, isLoading } = useListTrainingsQuery(roundType ? { roundType } : undefined);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Training catalog</h1>

      <div className="flex gap-2">
        <button
          className={`rounded border px-3 py-1 text-sm ${roundType === '' ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'border-gray-300 dark:border-gray-700'}`}
          onClick={() => setRoundType('')}
        >
          All
        </button>
        {ROUND_TYPES.map((rt) => (
          <button
            key={rt}
            className={`rounded border px-3 py-1 text-sm ${roundType === rt ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'border-gray-300 dark:border-gray-700'}`}
            onClick={() => setRoundType(rt)}
          >
            {rt}
          </button>
        ))}
      </div>

      {isLoading && <p>Loading...</p>}
      <ul className="flex flex-col gap-2">
        {data?.programs.map((program) => (
          <li key={program._id} className="rounded border border-gray-200 p-3 text-sm dark:border-gray-800">
            <Link to={`/trainings/${program._id}`} className="font-medium underline">
              {program.title}
            </Link>
            <p className="text-gray-500">{program.roundType}</p>
            <p>{program.description}</p>
          </li>
        ))}
        {data && data.programs.length === 0 && <p className="text-gray-500">No published trainings yet.</p>}
      </ul>
    </div>
  );
}
