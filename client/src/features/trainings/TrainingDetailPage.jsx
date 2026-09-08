import { useParams } from 'react-router-dom';
import { useGetTrainingQuery, useListModulesQuery } from './trainingsApi.js';

const TYPE_LABELS = {
  material: 'Reading material',
  quiz: 'Quiz',
  ai_interview: 'AI mock interview',
  gd_submission: 'GD / video submission',
};

export default function TrainingDetailPage() {
  const { programId } = useParams();
  const { data: programData, isLoading: loadingProgram } = useGetTrainingQuery(programId);
  const { data: modulesData, isLoading: loadingModules } = useListModulesQuery(programId);

  if (loadingProgram || loadingModules) return <p>Loading...</p>;

  const { program } = programData;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">{program.title}</h1>
      <p className="text-sm text-gray-500">{program.roundType}</p>
      <p className="text-sm">{program.description}</p>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Modules</h2>
        <ol className="flex flex-col gap-2">
          {modulesData.modules.map((module, i) => (
            <li key={module._id} className="rounded border border-gray-200 p-3 text-sm dark:border-gray-800">
              {i + 1}. {module.title} <span className="text-gray-500">({TYPE_LABELS[module.type]})</span>
            </li>
          ))}
        </ol>
        <p className="text-sm text-gray-500">
          Enrolling and taking modules is available once training progress tracking ships (Phase 3).
        </p>
      </section>
    </div>
  );
}
