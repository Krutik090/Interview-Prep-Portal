import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, FileUp, GraduationCap, PenLine, Sparkles } from 'lucide-react';
import {
  useGetQuestionnaireQuery,
  useSubmitOnboardingMutation,
  useParseResumeMutation,
} from './onboardingApi.js';
import { userPatched } from '../auth/authSlice.js';
import Button from '../../components/ui/Button.jsx';
import { Field, Input, Select, TagInput } from '../../components/ui/Field.jsx';
import { InlineError, LoadingState, Spinner } from '../../components/ui/Feedback.jsx';

const INITIAL_ANSWERS = {
  fullName: '',
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
const MAX_RESUME_MB = 5;

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
  if (!payload.education.branch) delete payload.education.branch;
  if (!payload.fullName?.trim()) delete payload.fullName;
  if (!payload.targetDomain?.trim()) delete payload.targetDomain;
  for (const field of TAG_FIELDS) {
    payload[field] = answers[field]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return payload;
}

/**
 * Merges what the server read from the resume into the form, and returns
 * which field paths were filled — so the form can say exactly which
 * answers came from the resume and need checking.
 */
function mergePrefill(current, prefill) {
  let next = current;
  const filled = new Set();
  const put = (path, value) => {
    next = setByPath(next, path, value);
    filled.add(path);
  };

  if (prefill.fullName) put('fullName', prefill.fullName);
  for (const key of ['degree', 'institution', 'branch']) {
    if (prefill.education?.[key]) put(`education.${key}`, prefill.education[key]);
  }
  if (prefill.education?.graduationYear) {
    put('education.graduationYear', String(prefill.education.graduationYear));
  }
  if (prefill.targetRole) put('targetRole', prefill.targetRole);
  if (prefill.targetDomain) put('targetDomain', prefill.targetDomain);
  if (prefill.experienceLevel) put('experienceLevel', prefill.experienceLevel);
  for (const key of ['currentSkills', 'strengths', 'preferredCompanies']) {
    if (prefill[key]?.length) put(key, prefill[key].join(', '));
  }
  return { answers: next, filled };
}

function Control({ field, value, onChange, a11y }) {
  if (field.type === 'select') {
    return (
      <Select {...a11y} value={value} onChange={(e) => onChange(e.target.value)}>
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
        {...a11y}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Separate each one with a comma"
      />
    );
  }
  return (
    <Input
      {...a11y}
      type={field.type === 'number' ? 'number' : 'text'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={field.required}
    />
  );
}

function StartChoice({ onUploaded, onManual }) {
  const [file, setFile] = useState(null);
  const [localError, setLocalError] = useState(null);
  const [parseResume, { isLoading, error }] = useParseResumeMutation();

  function chooseFile(next) {
    setLocalError(null);
    if (!next) return setFile(null);
    if (next.type !== 'application/pdf') {
      setLocalError('Choose a PDF. If your resume is a Word file, save it as PDF first.');
      return setFile(null);
    }
    if (next.size > MAX_RESUME_MB * 1024 * 1024) {
      setLocalError(`That file is over ${MAX_RESUME_MB}MB. Export a smaller PDF and try again.`);
      return setFile(null);
    }
    setFile(next);
  }

  async function handleUpload() {
    const formData = new FormData();
    formData.append('resume', file);
    const result = await parseResume(formData);
    if (result.data) onUploaded(result.data);
  }

  const serverError =
    error?.status === 429
      ? 'Too many uploads in a short time. Wait a minute, or fill in your details manually.'
      : error?.data?.message;

  return (
    <div className="mt-7 grid gap-4 sm:grid-cols-2">
      <section className="flex flex-col rounded-xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(20,22,31,0.04)]">
        <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <FileUp size={18} strokeWidth={1.9} aria-hidden="true" />
        </span>
        <h2 className="mt-3.5 text-[15px] font-semibold">I have a resume</h2>
        <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
          Upload it and we&apos;ll fill in what we can. You&apos;ll check every answer before
          anything is saved, and the file itself isn&apos;t kept.
        </p>

        <label
          className={`mt-4 flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed px-4 py-6 text-center transition-colors hover:border-brand ${
            file ? 'border-brand bg-brand-soft/50' : 'border-line-strong'
          }`}
        >
          <span className="text-sm font-medium text-ink">{file ? file.name : 'Choose a PDF'}</span>
          <span className="text-[12.5px] text-muted">PDF only, up to {MAX_RESUME_MB}MB</span>
          <input
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
          />
        </label>

        {(localError || serverError) && (
          <div className="mt-3">
            <InlineError>{localError || serverError}</InlineError>
          </div>
        )}

        <Button className="mt-4" icon={isLoading ? undefined : Sparkles} disabled={!file || isLoading} onClick={handleUpload}>
          {isLoading ? (
            <>
              <Spinner /> Reading your resume
            </>
          ) : (
            'Fill in from resume'
          )}
        </Button>
      </section>

      <section className="flex flex-col rounded-xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(20,22,31,0.04)]">
        <span className="flex size-9 items-center justify-center rounded-lg bg-ink/5 text-ink">
          <PenLine size={18} strokeWidth={1.9} aria-hidden="true" />
        </span>
        <h2 className="mt-3.5 text-[15px] font-semibold">I don&apos;t have one yet</h2>
        <p className="mt-1 flex-1 text-[13.5px] leading-relaxed text-muted">
          Answer a few short questions instead — about three minutes. Once you clear a training
          round, we&apos;ll build a resume for you.
        </p>
        <Button variant="secondary" className="mt-4" icon={ArrowRight} onClick={onManual}>
          Fill in manually
        </Button>
      </section>
    </div>
  );
}

export default function OnboardingWizard() {
  const { data: questionnaire, isLoading } = useGetQuestionnaireQuery();
  const [submitOnboarding, { isLoading: submitting, error }] = useSubmitOnboardingMutation();
  const [answers, setAnswers] = useState(INITIAL_ANSWERS);
  // -1 is the "how do you want to start" screen; 0..n are the question sections.
  const [step, setStep] = useState(-1);
  const [fromResume, setFromResume] = useState(() => new Set());
  const dispatch = useDispatch();
  const navigate = useNavigate();

  if (isLoading || !questionnaire) return <LoadingState label="Loading questions" />;

  const sections = questionnaire.sections;

  function handleUploaded({ prefill }) {
    const merged = mergePrefill(INITIAL_ANSWERS, prefill);
    setAnswers(merged.answers);
    setFromResume(merged.filled);
    setStep(0);
  }

  function updateField(path, value) {
    setAnswers((prev) => setByPath(prev, path, value));
    // Once edited it's the student's answer, not the resume's guess.
    setFromResume((prev) => {
      if (!prev.has(path)) return prev;
      const next = new Set(prev);
      next.delete(path);
      return next;
    });
  }

  const header = (
    <>
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
    </>
  );

  if (step === -1) {
    return (
      <div className="mx-auto flex min-h-svh max-w-[46rem] flex-col justify-center px-5 py-12">
        {header}
        <StartChoice onUploaded={handleUploaded} onManual={() => setStep(0)} />
      </div>
    );
  }

  const section = sections[step];
  const isLast = step === sections.length - 1;
  const stepComplete = section.fields
    .filter((f) => f.required)
    .every((f) => String(getByPath(answers, f.name) ?? '').trim().length > 0);
  const filledInThisStep = section.fields.filter((f) => fromResume.has(f.name)).length;

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
      {header}

      {/* Genuinely a sequence, so it's numbered like one. */}
      <ol className="mt-7 flex items-center gap-2">
        {sections.map((s, i) => (
          <li key={s.key} className="flex flex-1 items-center gap-2">
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums transition-colors ${
                i < step ? 'bg-pass text-white' : i === step ? 'bg-brand text-white' : 'bg-ink/8 text-muted'
              }`}
            >
              {i < step ? <Check size={13} strokeWidth={2.5} /> : i + 1}
            </span>
            <span className={`hidden text-[13px] font-medium sm:block ${i === step ? 'text-ink' : 'text-muted'}`}>
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

        {filledInThisStep > 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-brand-soft px-3 py-2 text-[13px] text-brand">
            <Sparkles size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            {filledInThisStep === 1 ? 'One answer was' : `${filledInThisStep} answers were`} filled in
            from your resume. Check them before continuing.
          </p>
        )}

        <div className="mt-5 flex flex-col gap-4">
          {section.fields.map((field) => (
            <Field
              key={field.name}
              label={field.label}
              required={field.required}
              hint={fromResume.has(field.name) ? 'From your resume' : undefined}
            >
              {(a11y) => (
                <Control
                  field={field}
                  a11y={a11y}
                  value={getByPath(answers, field.name)}
                  onChange={(value) => updateField(field.name, value)}
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
          <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep((s) => s - 1)}>
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
