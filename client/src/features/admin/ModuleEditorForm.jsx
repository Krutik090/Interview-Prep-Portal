import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
  useCreateModuleMutation,
  useUpdateModuleMutation,
  useRequestModuleAiDraftMutation,
} from '../trainings/trainingsApi.js';
import Button from '../../components/ui/Button.jsx';
import { Field, Input, Select, Textarea } from '../../components/ui/Field.jsx';
import { InlineError } from '../../components/ui/Feedback.jsx';

const EXAMPLE_QUESTIONS = [
  {
    questionText: '2 + 2 = ?',
    type: 'mcq',
    options: ['3', '4', '5'],
    correctAnswerIndex: 1,
    points: 1,
  },
];

const TYPE_OPTIONS = [
  { value: 'material', label: 'Reading material' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'ai_interview', label: 'AI mock interview' },
  { value: 'gd_submission', label: 'Written or video submission' },
];

export default function ModuleEditorForm({ programId, existingModule, onDone }) {
  const isEditing = Boolean(existingModule);
  const [type, setType] = useState(existingModule?.type ?? 'material');
  const [base, setBase] = useState({
    title: existingModule?.title ?? '',
    instructions: existingModule?.instructions ?? '',
    status: existingModule?.status ?? 'draft',
  });
  const [contentBody, setContentBody] = useState(existingModule?.contentBody ?? '');
  const [questionsJson, setQuestionsJson] = useState(
    existingModule?.questions
      ? JSON.stringify(existingModule.questions, null, 2)
      : JSON.stringify(EXAMPLE_QUESTIONS, null, 2),
  );
  const [focusArea, setFocusArea] = useState(existingModule?.focusArea ?? '');
  const [numQuestions, setNumQuestions] = useState(existingModule?.numQuestions ?? 5);
  const [prompt, setPrompt] = useState(existingModule?.prompt ?? '');
  const [draftTopic, setDraftTopic] = useState('');
  const [formError, setFormError] = useState(null);

  const [createModule, { isLoading: creating }] = useCreateModuleMutation();
  const [updateModule, { isLoading: updating }] = useUpdateModuleMutation();
  const [requestAiDraft, { isLoading: drafting }] = useRequestModuleAiDraftMutation();

  function buildPayload() {
    if (type === 'material') return { ...base, type, contentBody };
    if (type === 'quiz') {
      let questions;
      try {
        questions = JSON.parse(questionsJson);
      } catch {
        throw new Error('The questions need to be valid JSON. Check for a missing comma or bracket.');
      }
      return { ...base, type, questions };
    }
    if (type === 'ai_interview') {
      return { ...base, type, focusArea: focusArea || undefined, numQuestions: Number(numQuestions) };
    }
    return { ...base, type, prompt };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    let payload;
    try {
      payload = buildPayload();
    } catch (err) {
      setFormError(err.message);
      return;
    }

    const result = isEditing
      ? await updateModule({ programId, moduleId: existingModule._id, ...payload })
      : await createModule({ programId, ...payload });

    if (result.error) {
      setFormError('Could not save this module. Check the fields and try again.');
      return;
    }
    onDone();
  }

  async function handleAiDraft() {
    if (!isEditing) {
      setFormError('Save the module first, then ask for a draft.');
      return;
    }
    const contentType = type === 'quiz' ? 'quiz' : 'material';
    const result = await requestAiDraft({
      programId,
      moduleId: existingModule._id,
      contentType,
      topic: draftTopic || base.title,
    });
    if (result.error) {
      setFormError('The draft request failed. Try again in a moment.');
      return;
    }
    if (contentType === 'quiz') setQuestionsJson(JSON.stringify(result.data.draft.questions, null, 2));
    else setContentBody(result.data.draft.contentBody);
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <Field label="Module type" hint={isEditing ? "A module's type can't be changed after it's created." : undefined}>
          {(a) => (
            <Select {...a} value={type} disabled={isEditing} onChange={(e) => setType(e.target.value)}>
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Visible to students">
          {(a) => (
            <Select
              {...a}
              value={base.status}
              onChange={(e) => setBase((p) => ({ ...p, status: e.target.value }))}
            >
              <option value="draft">No — draft</option>
              <option value="published">Yes — published</option>
            </Select>
          )}
        </Field>
      </div>

      <Field label="Title" required>
        {(a) => (
          <Input
            {...a}
            value={base.title}
            onChange={(e) => setBase((p) => ({ ...p, title: e.target.value }))}
            required
          />
        )}
      </Field>

      <Field label="Instructions" hint="Shown to the student above the module.">
        {(a) => (
          <Textarea
            {...a}
            rows={2}
            value={base.instructions}
            onChange={(e) => setBase((p) => ({ ...p, instructions: e.target.value }))}
          />
        )}
      </Field>

      {(type === 'material' || type === 'quiz') && (
        <div className="rounded-lg border border-line bg-surface p-3.5">
          <p className="text-[13px] font-medium text-ink">Draft this with AI</p>
          <p className="mt-0.5 text-[12.5px] text-muted">
            You&apos;ll get a starting point to edit — nothing is published automatically.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Input
              className="min-w-0 flex-1"
              placeholder={`Topic (defaults to "${base.title || 'the title'}")`}
              value={draftTopic}
              onChange={(e) => setDraftTopic(e.target.value)}
            />
            <Button variant="secondary" icon={Sparkles} onClick={handleAiDraft} disabled={drafting}>
              {drafting ? 'Writing' : 'Draft'}
            </Button>
          </div>
        </div>
      )}

      {type === 'material' && (
        <Field label="Content" hint="Basic formatting is allowed; anything unsafe is stripped on save.">
          {(a) => (
            <Textarea
              {...a}
              rows={7}
              value={contentBody}
              onChange={(e) => setContentBody(e.target.value)}
            />
          )}
        </Field>
      )}

      {type === 'quiz' && (
        <Field
          label="Questions"
          hint="JSON list. Each needs questionText, type (mcq or short_answer), and the correct answer."
        >
          {(a) => (
            <Textarea
              {...a}
              rows={10}
              className="font-mono text-xs"
              value={questionsJson}
              onChange={(e) => setQuestionsJson(e.target.value)}
            />
          )}
        </Field>
      )}

      {type === 'ai_interview' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Focus area" hint="Optional — narrows what the questions cover.">
            {(a) => (
              <Input
                {...a}
                placeholder="e.g. data structures"
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value)}
              />
            )}
          </Field>
          <Field label="Number of questions">
            {(a) => (
              <Input
                {...a}
                type="number"
                min={1}
                max={20}
                value={numQuestions}
                onChange={(e) => setNumQuestions(e.target.value)}
              />
            )}
          </Field>
        </div>
      )}

      {type === 'gd_submission' && (
        <Field label="Prompt" required hint="The topic or question students respond to.">
          {(a) => (
            <Textarea
              {...a}
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
            />
          )}
        </Field>
      )}

      {formError && <InlineError>{formError}</InlineError>}

      <div className="flex items-center gap-2 border-t border-line pt-4">
        <Button type="submit" disabled={creating || updating}>
          {isEditing ? 'Save module' : 'Add module'}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
