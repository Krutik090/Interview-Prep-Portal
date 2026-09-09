import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronDown, ChevronLeft, FileText, ListChecks, MessagesSquare, Mic } from 'lucide-react';
import { useGetTrainingQuery, useListModulesQuery } from './trainingsApi.js';
import {
  useEnrollMutation,
  useListMyEnrollmentsQuery,
  useGetEnrollmentDetailQuery,
} from '../enrollments/enrollmentsApi.js';
import MaterialModuleView from './modules/MaterialModuleView.jsx';
import QuizModuleView from './modules/QuizModuleView.jsx';
import AiInterviewModuleView from './modules/AiInterviewModuleView.jsx';
import GdSubmissionModuleView from './modules/GdSubmissionModuleView.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { Panel, PanelHeader } from '../../components/ui/Panel.jsx';
import Button from '../../components/ui/Button.jsx';
import { RoundBadge, StatusBadge } from '../../components/ui/Badge.jsx';
import { ProgressBar, ScorePill } from '../../components/ui/Progress.jsx';
import { LoadingState } from '../../components/ui/Feedback.jsx';
import { MODULE_META } from '../../components/ui/meta.js';

const MODULE_VIEWS = {
  material: MaterialModuleView,
  quiz: QuizModuleView,
  ai_interview: AiInterviewModuleView,
  gd_submission: GdSubmissionModuleView,
};

const MODULE_ICONS = {
  material: FileText,
  quiz: ListChecks,
  ai_interview: Mic,
  gd_submission: MessagesSquare,
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
  const { data: enrollmentDetail } = useGetEnrollmentDetailQuery(enrollment?._id, {
    skip: !enrollment,
  });
  const progressByModule = useMemo(() => {
    const map = new Map();
    for (const p of enrollmentDetail?.moduleProgress ?? []) map.set(p.module, p);
    return map;
  }, [enrollmentDetail]);

  if (loadingProgram || loadingModules || loadingEnrollments) return <LoadingState />;

  const { program } = programData;
  const modules = modulesData.modules;
  const passMark = program.passCriteria?.minOverallScorePct ?? 70;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/trainings"
        className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink"
      >
        <ChevronLeft size={15} aria-hidden="true" />
        All programs
      </Link>

      <PageHeader
        title={program.title}
        description={program.description}
        actions={
          !enrollment && (
            <Button onClick={() => enroll(programId)} disabled={enrolling}>
              {enrolling ? 'Enrolling' : 'Enroll in this program'}
            </Button>
          )
        }
      >
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <RoundBadge roundType={program.roundType} />
          {enrollment && <StatusBadge status={enrollment.status} />}
          <span className="text-[12.5px] text-muted">Pass mark {passMark}%</span>
        </div>
      </PageHeader>

      {enrollment && (
        <Panel className="mb-5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium text-muted">Your progress</p>
              <p className="mt-1 font-display text-[22px] font-semibold leading-none">
                {enrollment.completedModules} of {enrollment.totalModules}{' '}
                <span className="text-[15px] font-medium text-muted">modules done</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[13px] font-medium text-muted">Overall score</p>
              <div className="mt-1.5">
                <ScorePill score={enrollment.overallScorePct} threshold={passMark} />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <ProgressBar
              value={enrollment.completedModules}
              total={enrollment.totalModules}
              tone={enrollment.status === 'failed' ? 'fail' : enrollment.status === 'passed' ? 'pass' : 'brand'}
              showLabel={false}
            />
          </div>
        </Panel>
      )}

      <Panel>
        <PanelHeader
          title="Modules"
          description={
            enrollment
              ? 'Work through these in any order. Your score is the average across all of them.'
              : 'Enroll to start working through these.'
          }
        />
        <ol className="divide-y divide-line">
          {modules.map((module, i) => {
            const progress = progressByModule.get(module._id);
            const ModuleView = MODULE_VIEWS[module.type];
            const Icon = MODULE_ICONS[module.type];
            const isOpen = openModuleId === module._id;

            return (
              <li key={module._id}>
                <button
                  type="button"
                  disabled={!enrollment}
                  onClick={() => setOpenModuleId(isOpen ? null : module._id)}
                  className="flex w-full items-center gap-3.5 px-5 py-4 text-left transition-colors enabled:hover:bg-paper/70 disabled:cursor-not-allowed"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">
                      <span className="tabular-nums text-muted">{i + 1}.</span> {module.title}
                    </span>
                    <span className="block text-[12.5px] text-muted">
                      {MODULE_META[module.type]?.label}
                    </span>
                  </span>
                  {progress?.scorePct != null && <ScorePill score={progress.scorePct} />}
                  <StatusBadge status={progress?.status ?? 'not_started'} />
                  {enrollment && (
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  )}
                </button>

                {enrollment && isOpen && ModuleView && (
                  <div className="border-t border-line bg-paper/40 px-5 py-5">
                    <ModuleView programId={programId} module={module} progress={progress} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </Panel>
    </div>
  );
}
