import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useGetQuestionnaireQuery, useSubmitOnboardingMutation } from './onboardingApi.js';
import { userPatched } from '../auth/authSlice.js';

const INITIAL_ANSWERS = {
  education: { degree: '', institution: '', graduationYear: '', branch: '' },
  targetRole: '',
  targetDomain: '',
  experienceLevel: 'fresher',
  currentSkills: '',
  strengths: '',
  weaknesses: '',
  preferredCompanies: '',
};

function getByPath(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function setByPath(obj, path, value) {
  const [head, ...rest] = path.split('.');
  if (rest.length === 0) return { ...obj, [head]: value };
  return { ...obj, [head]: setByPath(obj[head] ?? {}, rest.join('.'), value) };
}

const TAG_FIELDS = ['currentSkills', 'strengths', 'weaknesses', 'preferredCompanies'];

function toSubmitPayload(answers) {
  const payload = { ...answers, education: { ...answers.education } };
  payload.education.graduationYear = Number(answers.education.graduationYear);
  for (const field of TAG_FIELDS) {
    payload[field] = answers[field]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return payload;
}

function Field({ field, value, onChange }) {
  if (field.type === 'select') {
    return (
      <select
        className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {field.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
      type={field.type === 'number' ? 'number' : 'text'}
      placeholder={field.type === 'tags' ? `${field.label} (comma-separated)` : field.label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={field.required}
    />
  );
}

export default function OnboardingWizard() {
  const { data: questionnaire, isLoading } = useGetQuestionnaireQuery();
  const [submitOnboarding, { isLoading: submitting, error }] = useSubmitOnboardingMutation();
  const [answers, setAnswers] = useState(INITIAL_ANSWERS);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    const result = await submitOnboarding(toSubmitPayload(answers));
    if (result.error) return;
    dispatch(userPatched({ onboardingCompleted: true }));
    navigate('/dashboard');
  }

  if (isLoading || !questionnaire) {
    return <p>Loading questionnaire...</p>;
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Tell us about yourself</h1>
      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        {questionnaire.sections.map((section) => (
          <fieldset key={section.key} className="flex flex-col gap-3">
            <legend className="mb-1 font-medium">{section.title}</legend>
            {section.fields.map((field) => (
              <label key={field.name} className="flex flex-col gap-1 text-sm">
                {field.label}
                <Field
                  field={field}
                  value={getByPath(answers, field.name)}
                  onChange={(value) => setAnswers((prev) => setByPath(prev, field.name, value))}
                />
              </label>
            ))}
          </fieldset>
        ))}
        {error && (
          <p className="text-sm text-red-600">
            {error.data?.message ?? 'Could not submit onboarding answers.'}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-gray-900 px-3 py-2 text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
        >
          {submitting ? 'Submitting...' : 'Finish onboarding'}
        </button>
      </form>
    </div>
  );
}
