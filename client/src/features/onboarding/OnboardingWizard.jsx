import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, GraduationCap } from 'lucide-react';
import { useGetQuestionnaireQuery, useSubmitOnboardingMutation } from './onboardingApi.js';
import { userPatched } from '../auth/authSlice.js';
import Button from '../../components/ui/Button.jsx';
import { Field, Input, Select, TagInput } from '../../components/ui/Field.jsx';
import { InlineError, LoadingState } from '../../components/ui/Feedback.jsx';

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

const TAG_FIELDS = ['currentSkills', 'strengths', 'weaknesses', 'preferredCompanies'];

function getByPath(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function setByPath(obj, path, value) {
  const [head, ...rest] = path.split('.');
  if (rest.length === 0) return { ...obj, [head]: value };
  return { ...obj, [head]: setByPath(obj[head] ?? {}, rest.join('.'), value) };
}

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

function Control({ field, value, onChange }) {
  if (field.type === 'select') {
    return (
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </Select>
    );
  }
  if (field.type === 'tags') {
    return (
      <TagInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Separate each one with a comma"
      />
    );
  }
  return (
    <Input
      type={field.type === 'number' ? 'number' : 'text'}
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
  const [step, setStep] = useState(0);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  if (isLoading || !questionnaire) return <LoadingState label="Loading questions" />;

  const sections = questionnaire.sections;
  const section = sections[step];
  const isLast = step === sections.length - 1;

  const stepComplete = section.fields
    .filter((f) => f.required)
    .every((f) => String(getByPath(answers, f.name) ?? '').trim().length > 0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }
    const result = await submitOnboarding(toSubmitPayload(answers));
    if (result.error) return;
    dispatch(userPatched({ onboardingCompleted: true }));
    navigate('/dashboard');
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-[40rem] flex-col justify-center px-5 py-12">
      <div className="mb-8 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-brand text-white">
          <GraduationCap size={19} strokeWidth={1.9} aria-hidden="true" />
        </span>
        <span className="font-display text-[15px] font-semibold">Placement Prep</span>
      </div>

      <h1 className="font-display text-[28px] font-semibold leading-tight">Tell us about yourself</h1>
      <p className="mt-1.5 max-w-[54ch] text-sm text-muted">
        We use this to suggest which rounds to focus on first. You can change any of it later from
        your profile.
      </p>

      {/* Genuinely a sequence, so it's numbered like one. */}
      <ol className="mt-7 flex items-center gap-2">
        {sections.map((s, i) => (
          <li key={s.key} className="flex flex-1 items-center gap-2">
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums transition-colors ${
                i < step
                  ? 'bg-pass text-white'
                  : i === step
                    ? 'bg-brand text-white'
                    : 'bg-ink/8 text-muted'
              }`}
            >
              {i < step ? <Check size={13} strokeWidth={2.5} /> : i + 1}
            </span>
            <span
              className={`hidden text-[13px] font-medium sm:block ${i === step ? 'text-ink' : 'text-muted'}`}
            >
              {s.title}
            </span>
            {i < sections.length - 1 && <span className="h-px flex-1 bg-line-strong" />}
          </li>
        ))}
      </ol>

      <form
        className="mt-6 rounded-xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(20,22,31,0.04)]"
        onSubmit={handleSubmit}
      >
        <h2 className="text-[15px] font-semibold">{section.title}</h2>

        <div className="mt-5 flex flex-col gap-4">
          {section.fields.map((field) => (
            <Field key={field.name} label={field.label} required={field.required}>
              {() => (
                <Control
                  field={field}
                  value={getByPath(answers, field.name)}
                  onChange={(value) => setAnswers((prev) => setByPath(prev, field.name, value))}
                />
              )}
            </Field>
          ))}
        </div>

        {error && (
          <div className="mt-4">
            <InlineError>
              Some answers need fixing before we can continue. Check the required fields above.
            </InlineError>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-5">
          <Button
            variant="ghost"
            icon={ArrowLeft}
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
          >
            Back
          </Button>
          <Button type="submit" icon={isLast ? Check : ArrowRight} disabled={submitting || !stepComplete}>
            {isLast ? (submitting ? 'Finishing' : 'Finish setup') : 'Continue'}
          </Button>
        </div>
      </form>
    </div>
  );
}
