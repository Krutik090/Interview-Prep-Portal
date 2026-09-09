import { useState } from 'react';
import { useUpdateMyProfileMutation } from './profileApi.js';
import Button from '../../components/ui/Button.jsx';
import { Field, Input, TagInput } from '../../components/ui/Field.jsx';
import { InlineError } from '../../components/ui/Feedback.jsx';

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

  const set = (name) => (e) => setForm((prev) => ({ ...prev, [name]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const result = await updateMyProfile({
      fullName: form.fullName,
      targetRole: form.targetRole,
      targetDomain: form.targetDomain,
      currentSkills: stringToTags(form.currentSkills),
      strengths: stringToTags(form.strengths),
      weaknesses: stringToTags(form.weaknesses),
      preferredCompanies: stringToTags(form.preferredCompanies),
    });
    if (!result.error) onDone();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <Field label="Full name">
        {(a) => <Input {...a} value={form.fullName} onChange={set('fullName')} />}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Target role" hint="The job title you're preparing for.">
          {(a) => <Input {...a} value={form.targetRole} onChange={set('targetRole')} />}
        </Field>
        <Field label="Target domain">
          {(a) => <Input {...a} value={form.targetDomain} onChange={set('targetDomain')} />}
        </Field>
      </div>

      <Field label="Skills" hint="Separate each one with a comma.">
        {(a) => <TagInput {...a} value={form.currentSkills} onChange={set('currentSkills')} />}
      </Field>

      <Field label="Strengths" hint="Separate each one with a comma.">
        {(a) => <TagInput {...a} value={form.strengths} onChange={set('strengths')} />}
      </Field>

      <Field label="Areas to improve" hint="Separate each one with a comma.">
        {(a) => <TagInput {...a} value={form.weaknesses} onChange={set('weaknesses')} />}
      </Field>

      <Field label="Preferred companies" hint="Separate each one with a comma.">
        {(a) => (
          <TagInput {...a} value={form.preferredCompanies} onChange={set('preferredCompanies')} />
        )}
      </Field>

      {error && <InlineError>Could not save your changes. Check the fields and try again.</InlineError>}

      <div className="mt-2 flex items-center gap-2 border-t border-line pt-5">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving' : 'Save changes'}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
