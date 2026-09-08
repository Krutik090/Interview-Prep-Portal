import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useListTrainingsQuery,
  useCreateTrainingMutation,
  useSetTrainingPublishStatusMutation,
  useDeleteTrainingMutation,
} from '../trainings/trainingsApi.js';

const ROUND_TYPES = ['Aptitude', 'GD', 'Technical', 'HR'];

export default function AdminDashboardPage() {
  const { data, isLoading } = useListTrainingsQuery();
  const [createTraining, { isLoading: creating, error }] = useCreateTrainingMutation();
  const [setPublishStatus] = useSetTrainingPublishStatusMutation();
  const [deleteTraining] = useDeleteTrainingMutation();
  const [form, setForm] = useState({ title: '', roundType: ROUND_TYPES[0], description: '' });

  async function handleCreate(e) {
    e.preventDefault();
    const result = await createTraining(form);
    if (!result.error) setForm({ title: '', roundType: ROUND_TYPES[0], description: '' });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Training programs</h1>

      <form className="flex flex-col gap-3 rounded border border-gray-200 p-4 dark:border-gray-800" onSubmit={handleCreate}>
        <h2 className="font-medium">New program</h2>
        <input
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          required
        />
        <select
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          value={form.roundType}
          onChange={(e) => setForm((prev) => ({ ...prev, roundType: e.target.value }))}
        >
          {ROUND_TYPES.map((rt) => (
            <option key={rt} value={rt}>
              {rt}
            </option>
          ))}
        </select>
        <textarea
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
        />
        {error && <p className="text-sm text-red-600">Could not create program.</p>}
        <button
          type="submit"
          disabled={creating}
          className="self-start rounded bg-gray-900 px-3 py-2 text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
        >
          {creating ? 'Creating...' : 'Create'}
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {isLoading && <p>Loading...</p>}
        {data?.programs.map((program) => (
          <li
            key={program._id}
            className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800"
          >
            <Link to={`/admin/trainings/${program._id}`} className="underline">
              {program.title} <span className="text-gray-500">({program.roundType}, {program.status})</span>
            </Link>
            <span className="flex gap-2">
              <button
                className="underline"
                onClick={() => setPublishStatus({ programId: program._id, publish: program.status !== 'published' })}
              >
                {program.status === 'published' ? 'Unpublish' : 'Publish'}
              </button>
              <button className="text-red-600 underline" onClick={() => deleteTraining(program._id)}>
                Delete
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
