import { useState } from 'react';
import { useUpdateMyProfileMutation } from './profileApi.js';

function tagsToString(tags) {
  return (tags ?? []).join(', ');
}

function stringToTags(value) {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function ProfileEditForm({ profile, onDone }) {
  const [form, setForm] = useState({
    fullName: profile.fullName ?? '',
    targetRole: profile.targetRole ?? '',
    targetDomain: profile.targetDomain ?? '',
    currentSkills: tagsToString(profile.currentSkills),
    strengths: tagsToString(profile.strengths),
    weaknesses: tagsToString(profile.weaknesses),
    preferredCompanies: tagsToString(profile.preferredCompanies),
  });
  const [updateMyProfile, { isLoading, error }] = useUpdateMyProfileMutation();

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      fullName: form.fullName,
      targetRole: form.targetRole,
      targetDomain: form.targetDomain,
      currentSkills: stringToTags(form.currentSkills),
      strengths: stringToTags(form.strengths),
      weaknesses: stringToTags(form.weaknesses),
      preferredCompanies: stringToTags(form.preferredCompanies),
    };
    const result = await updateMyProfile(payload);
    if (!result.error) onDone();
  }

  function field(name, label) {
    return (
      <label className="flex flex-col gap-1 text-sm">
        {label}
        <input
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          value={form[name]}
          onChange={(e) => setForm((prev) => ({ ...prev, [name]: e.target.value }))}
        />
      </label>
    );
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      {field('fullName', 'Full name')}
      {field('targetRole', 'Target role')}
      {field('targetDomain', 'Target domain')}
      {field('currentSkills', 'Skills (comma-separated)')}
      {field('strengths', 'Strengths (comma-separated)')}
      {field('weaknesses', 'Areas to improve (comma-separated)')}
      {field('preferredCompanies', 'Preferred companies (comma-separated)')}
      {error && <p className="text-sm text-red-600">Could not save profile.</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded bg-gray-900 px-3 py-2 text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
        >
          {isLoading ? 'Saving...' : 'Save'}
        </button>
        <button type="button" className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}
