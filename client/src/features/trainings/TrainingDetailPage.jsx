import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGetTrainingQuery, useListModulesQuery } from './trainingsApi.js';
import { useEnrollMutation, useListMyEnrollmentsQuery, useGetEnrollmentDetailQuery } from '../enrollments/enrollmentsApi.js';
import MaterialModuleView from './modules/MaterialModuleView.jsx';
import QuizModuleView from './modules/QuizModuleView.jsx';
import AiInterviewModuleView from './modules/AiInterviewModuleView.jsx';
import GdSubmissionModuleView from './modules/GdSubmissionModuleView.jsx';

const TYPE_LABELS = {
  material: 'Reading material',
  quiz: 'Quiz',
  ai_interview: 'AI mock interview',
  gd_submission: 'GD / video submission',
};

const MODULE_VIEWS = {
  material: MaterialModuleView,
  quiz: QuizModuleView,
  ai_interview: AiInterviewModuleView,
  gd_submission: GdSubmissionModuleView,
};

export default function TrainingDetailPage() {
  const { programId } = useParams();
  const { data: programData, isLoading: loadingProgram } = useGetTrainingQuery(programId);
  const { data: modulesData, isLoading: loadingModules } = useListModulesQuery(programId);
  const { data: myEnrollments, isLoading: loadingEnrollments } = useListMyEnrollmentsQuery();
  const [enroll, { isLoading: enrolling }] = useEnrollMutation();
  const [openModuleId, setOpenModuleId] = useState(null);

  const enrollment = useMemo(
    () => myEnrollments?.enrollments.find((e) => e.program?._id === programId),
    [myEnrollments, programId],
  );
  const { data: enrollmentDetail } = useGetEnrollmentDetailQuery(enrollment?._id, { skip: !enrollment });
  const progressByModule = useMemo(() => {
    const map = new Map();
    for (const p of enrollmentDetail?.moduleProgress ?? []) map.set(p.module, p);
    return map;
  }, [enrollmentDetail]);

  if (loadingProgram || loadingModules || loadingEnrollments) return <p>Loading...</p>;

  const { program } = programData;
  const modules = modulesData.modules;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">{program.title}</h1>
      <p className="text-sm text-gray-500">{program.roundType}</p>
      <p className="text-sm">{program.description}</p>

      {!enrollment ? (
        <button
          onClick={() => enroll(programId)}
          disabled={enrolling}
          className="self-start rounded bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
        >
          {enrolling ? 'Enrolling...' : 'Enroll'}
        </button>
      ) : (
        <p className="text-sm">
          Progress: {enrollment.completedModules}/{enrollment.totalModules} modules ·{' '}
          <span className="font-medium">{enrollment.status}</span>
        </p>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Modules</h2>
        <ol className="flex flex-col gap-2">
          {modules.map((module, i) => {
            const progress = progressByModule.get(module._id);
            const ModuleView = MODULE_VIEWS[module.type];
            return (
              <li key={module._id} className="rounded border border-gray-200 dark:border-gray-800">
                <button
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm"
                  disabled={!enrollment}
                  onClick={() => setOpenModuleId(openModuleId === module._id ? null : module._id)}
                >
                  <span>
                    {i + 1}. {module.title} <span className="text-gray-500">({TYPE_LABELS[module.type]})</span>
                  </span>
                  <span className="text-gray-500">{progress?.status ?? 'not started'}</span>
                </button>
                {enrollment && openModuleId === module._id && ModuleView && (
                  <div className="border-t border-gray-200 p-3 dark:border-gray-800">
                    <ModuleView programId={programId} module={module} progress={progress} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
