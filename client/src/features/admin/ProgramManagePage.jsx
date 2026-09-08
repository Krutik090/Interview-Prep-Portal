import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  useGetTrainingQuery,
  useListModulesQuery,
  useUpdateTrainingMutation,
  useSetTrainingPublishStatusMutation,
  useDeleteModuleMutation,
} from '../trainings/trainingsApi.js';
import ModuleEditorForm from './ModuleEditorForm.jsx';

const TYPE_LABELS = {
  material: 'Material',
  quiz: 'Quiz',
  ai_interview: 'AI mock interview',
  gd_submission: 'GD/video submission',
};

export default function ProgramManagePage() {
  const { programId } = useParams();
  const { data: programData, isLoading: loadingProgram } = useGetTrainingQuery(programId);
  const { data: modulesData, isLoading: loadingModules } = useListModulesQuery(programId);
  const [updateTraining] = useUpdateTrainingMutation();
  const [setPublishStatus] = useSetTrainingPublishStatusMutation();
  const [deleteModule] = useDeleteModuleMutation();
  const [editingModuleId, setEditingModuleId] = useState(undefined);
  const [addingModule, setAddingModule] = useState(false);

  if (loadingProgram || loadingModules) return <p>Loading...</p>;

  const program = programData.program;
  const modules = modulesData.modules;

  async function handlePassCriteriaSave(minOverallScorePct) {
    await updateTraining({ programId, passCriteria: { minOverallScorePct: Number(minOverallScorePct) } });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{program.title}</h1>
          <p className="text-sm text-gray-500">
            {program.roundType} · {program.status}
          </p>
        </div>
        <button
          className="rounded border border-gray-300 px-3 py-1 text-sm dark:border-gray-700"
          onClick={() => setPublishStatus({ programId, publish: program.status !== 'published' })}
        >
          {program.status === 'published' ? 'Unpublish' : 'Publish'}
        </button>
      </div>

      <p className="text-sm">{program.description}</p>

      <label className="flex max-w-xs flex-col gap-1 text-sm">
        Minimum overall score to pass (%)
        <input
          type="number"
          min={0}
          max={100}
          defaultValue={program.passCriteria?.minOverallScorePct ?? 70}
          onBlur={(e) => handlePassCriteriaSave(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
      </label>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Modules ({modules.length})</h2>
          <button
            className="rounded border border-gray-300 px-3 py-1 text-sm dark:border-gray-700"
            onClick={() => setAddingModule(true)}
          >
            + Add module
          </button>
        </div>

        {addingModule && (
          <ModuleEditorForm programId={programId} onDone={() => setAddingModule(false)} />
        )}

        <ul className="flex flex-col gap-2">
          {modules.map((module) =>
            editingModuleId === module._id ? (
              <li key={module._id}>
                <ModuleEditorForm
                  programId={programId}
                  existingModule={module}
                  onDone={() => setEditingModuleId(undefined)}
                />
              </li>
            ) : (
              <li
                key={module._id}
                className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800"
              >
                <span>
                  {module.title}{' '}
                  <span className="text-gray-500">
                    ({TYPE_LABELS[module.type]}, {module.status})
                  </span>
                </span>
                <span className="flex gap-2">
                  <button className="underline" onClick={() => setEditingModuleId(module._id)}>
                    Edit
                  </button>
                  <button
                    className="text-red-600 underline"
                    onClick={() => deleteModule({ programId, moduleId: module._id })}
                  >
                    Delete
                  </button>
                </span>
              </li>
            ),
          )}
        </ul>
      </section>
    </div>
  );
}
