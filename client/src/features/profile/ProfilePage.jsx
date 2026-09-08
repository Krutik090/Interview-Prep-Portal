import { useState } from 'react';
import { useGetMyProfileQuery, useRefreshAiSummaryMutation } from './profileApi.js';
import ProfileEditForm from './ProfileEditForm.jsx';

export default function ProfilePage() {
  const { data, isLoading, error } = useGetMyProfileQuery();
  const [refreshAiSummary, { isLoading: refreshing }] = useRefreshAiSummaryMutation();
  const [editing, setEditing] = useState(false);

  if (isLoading) return <p>Loading profile...</p>;
  if (error) return <p className="text-red-600">Could not load your profile.</p>;

  const { profile } = data;

  if (editing) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <h1 className="mb-4 text-2xl font-semibold">Edit profile</h1>
        <ProfileEditForm profile={profile} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{profile.fullName || 'Your profile'}</h1>
        <button
          className="rounded border border-gray-300 px-3 py-1 text-sm dark:border-gray-700"
          onClick={() => setEditing(true)}
        >
          Edit
        </button>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-gray-500">Target role</dt>
        <dd>{profile.targetRole}</dd>
        <dt className="text-gray-500">Experience level</dt>
        <dd>{profile.experienceLevel}</dd>
        <dt className="text-gray-500">Skills</dt>
        <dd>{profile.currentSkills?.join(', ') || '—'}</dd>
      </dl>

      <section className="rounded border border-gray-200 p-4 dark:border-gray-800">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-medium">AI summary</h2>
          <button
            className="text-sm underline disabled:opacity-50"
            disabled={refreshing}
            onClick={() => refreshAiSummary()}
          >
            {refreshing ? 'Queuing...' : 'Refresh'}
          </button>
        </div>
        {profile.aiSummary?.text ? (
          <>
            <p className="text-sm">{profile.aiSummary.text}</p>
            <p className="mt-2 text-sm text-gray-500">
              Suggested focus: {profile.aiSummary.suggestedTracks?.join(', ')}
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-500">Still generating your AI summary — check back shortly.</p>
        )}
      </section>
    </div>
  );
}
