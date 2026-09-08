import { useState } from 'react';
import {
  useCreateModuleMutation,
  useUpdateModuleMutation,
  useRequestModuleAiDraftMutation,
} from '../trainings/trainingsApi.js';

const EXAMPLE_QUESTIONS = [
  { questionText: '2 + 2 = ?', type: 'mcq', options: ['3', '4', '5'], correctAnswerIndex: 1, points: 1 },
];

const TYPE_LABELS = {
  material: 'Material + quiz',
  quiz: 'Quiz',
  ai_interview: 'AI mock interview',
  gd_submission: 'GD / video submission',
};

function baseFieldsFrom(module) {
  return {
    title: module?.title ?? '',
    instructions: module?.instructions ?? '',
    isRequired: module?.isRequired ?? true,
  };
}

export default function ModuleEditorForm({ programId, existingModule, onDone }) {
  const isEditing = Boolean(existingModule);
  const [type, setType] = useState(existingModule?.type ?? 'material');
  const [base, setBase] = useState(baseFieldsFrom(existingModule));
  const [contentBody, setContentBody] = useState(existingModule?.contentBody ?? '');
  const [questionsJson, setQuestionsJson] = useState(
    existingModule?.questions ? JSON.stringify(existingModule.questions, null, 2) : JSON.stringify(EXAMPLE_QUESTIONS, null, 2),
  );
  const [focusArea, setFocusArea] = useState(existingModule?.focusArea ?? '');
  const [numQuestions, setNumQuestions] = useState(existingModule?.numQuestions ?? 5);
  const [prompt, setPrompt] = useState(existingModule?.prompt ?? '');
  const [formError, setFormError] = useState(null);
  const [draftTopic, setDraftTopic] = useState('');

  const [createModule, { isLoading: creating }] = useCreateModuleMutation();
  const [updateModule, { isLoading: updating }] = useUpdateModuleMutation();
  const [requestAiDraft, { isLoading: drafting }] = useRequestModuleAiDraftMutation();

  function buildPayload() {
    if (type === 'material') {
      return { ...base, type, contentBody };
    }
    if (type === 'quiz') {
      let questions;
      try {
        questions = JSON.parse(questionsJson);
      } catch {
        throw new Error('Questions must be valid JSON.');
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
      setFormError(result.error.data?.message ?? 'Could not save module.');
      return;
    }
    onDone();
  }

  async function handleAiDraft() {
    const contentType = type === 'quiz' ? 'quiz' : 'material';
    if (!isEditing) {
      setFormError('Save the module first, then request an AI draft for it.');
      return;
    }
    const result = await requestAiDraft({
      programId,
      moduleId: existingModule._id,
      contentType,
      topic: draftTopic || base.title,
    });
    if (result.error) {
      setFormError('AI draft request failed.');
      return;
    }
    if (contentType === 'quiz') {
      setQuestionsJson(JSON.stringify(result.data.draft.questions, null, 2));
    } else {
      setContentBody(result.data.draft.contentBody);
    }
  }

  return (
    <form className="flex flex-col gap-3 rounded border border-gray-200 p-4 dark:border-gray-800" onSubmit={handleSubmit}>
      <label className="flex flex-col gap-1 text-sm">
        Type
        <select
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          value={type}
          disabled={isEditing}
          onChange={(e) => setType(e.target.value)}
        >
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Title
        <input
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          value={base.title}
          onChange={(e) => setBase((prev) => ({ ...prev, title: e.target.value }))}
          required
        />
      </label>

      {type === 'material' && (
        <label className="flex flex-col gap-1 text-sm">
          Content body
          <textarea
            className="min-h-32 rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            value={contentBody}
            onChange={(e) => setContentBody(e.target.value)}
          />
        </label>
      )}

      {type === 'quiz' && (
        <label className="flex flex-col gap-1 text-sm">
          Questions (JSON)
          <textarea
            className="min-h-40 rounded border border-gray-300 px-3 py-2 font-mono text-xs dark:border-gray-700 dark:bg-gray-900"
            value={questionsJson}
            onChange={(e) => setQuestionsJson(e.target.value)}
          />
        </label>
      )}

      {type === 'ai_interview' && (
        <>
          <label className="flex flex-col gap-1 text-sm">
            Focus area (optional)
            <input
              className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Number of questions
            <input
              type="number"
              min={1}
              max={20}
              className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              value={numQuestions}
              onChange={(e) => setNumQuestions(e.target.value)}
            />
          </label>
        </>
      )}

      {type === 'gd_submission' && (
        <label className="flex flex-col gap-1 text-sm">
          Discussion/video prompt
          <textarea
            className="min-h-24 rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
          />
        </label>
      )}

      {(type === 'material' || type === 'quiz') && (
        <div className="flex items-center gap-2">
          <input
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            placeholder="AI draft topic (optional, defaults to title)"
            value={draftTopic}
            onChange={(e) => setDraftTopic(e.target.value)}
          />
          <button
            type="button"
            disabled={drafting}
            onClick={handleAiDraft}
            className="whitespace-nowrap rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 disabled:opacity-50"
          >
            {drafting ? 'Drafting...' : 'AI draft'}
          </button>
        </div>
      )}

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={creating || updating}
          className="rounded bg-gray-900 px-3 py-2 text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
        >
          {isEditing ? 'Save module' : 'Add module'}
        </button>
        <button type="button" className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}
