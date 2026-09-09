import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, FileText, ListChecks, MessagesSquare, Mic, Plus, Trash2, Users } from 'lucide-react';
import {
  useGetTrainingQuery,
  useListModulesQuery,
  useUpdateTrainingMutation,
  useSetTrainingPublishStatusMutation,
  useDeleteModuleMutation,
} from '../trainings/trainingsApi.js';
import { useListRosterQuery } from '../enrollments/enrollmentsApi.js';
import ModuleEditorForm from './ModuleEditorForm.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { Panel, PanelHeader } from '../../components/ui/Panel.jsx';
import Button from '../../components/ui/Button.jsx';
import { Field, Input } from '../../components/ui/Field.jsx';
import { RoundBadge, StatusBadge } from '../../components/ui/Badge.jsx';
import { ScorePill, ProgressBar } from '../../components/ui/Progress.jsx';
import { Table, Th, Td, Tr } from '../../components/ui/Table.jsx';
import { EmptyState, LoadingState } from '../../components/ui/Feedback.jsx';
import { MODULE_META } from '../../components/ui/meta.js';

const MODULE_ICONS = {
  material: FileText,
  quiz: ListChecks,
  ai_interview: Mic,
  gd_submission: MessagesSquare,
};

export default function ProgramManagePage() {
  const { programId } = useParams();
  const { data: programData, isLoading: loadingProgram } = useGetTrainingQuery(programId);
  const { data: modulesData, isLoading: loadingModules } = useListModulesQuery(programId);
  const { data: rosterData } = useListRosterQuery(programId);
  const [updateTraining] = useUpdateTrainingMutation();
  const [setPublishStatus] = useSetTrainingPublishStatusMutation();
  const [deleteModule] = useDeleteModuleMutation();
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [addingModule, setAddingModule] = useState(false);

  if (loadingProgram || loadingModules) return <LoadingState />;

  const { program } = programData;
  const modules = modulesData.modules;
  const roster = rosterData?.roster ?? [];
  const published = program.status === 'published';

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/admin/trainings"
        className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink"
      >
        <ChevronLeft size={15} aria-hidden="true" />
        All programs
      </Link>

      <PageHeader
        title={program.title}
        description={program.description}
        actions={
          <Button
            variant={published ? 'secondary' : 'primary'}
            onClick={() => setPublishStatus({ programId, publish: !published })}
          >
            {published ? 'Unpublish' : 'Publish for students'}
          </Button>
        }
      >
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <RoundBadge roundType={program.roundType} />
          <StatusBadge status={program.status} />
        </div>
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-5">
          <Panel>
            <PanelHeader
              title={`Modules (${modules.length})`}
              description="Students work through these in order. Each counts toward the program score."
              actions={
                <Button size="sm" icon={Plus} onClick={() => setAddingModule(true)}>
                  Add module
                </Button>
              }
            />

            {addingModule && (
              <div className="border-b border-line bg-paper/40 px-5 py-5">
                <ModuleEditorForm programId={programId} onDone={() => setAddingModule(false)} />
              </div>
            )}

            {modules.length === 0 && !addingModule ? (
              <EmptyState
                icon={ListChecks}
                title="No modules yet"
                description="Add reading material, a quiz, a mock interview, or a submission task."
                action={
                  <Button size="sm" icon={Plus} onClick={() => setAddingModule(true)}>
                    Add module
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-line">
                {modules.map((module, i) => {
                  const Icon = MODULE_ICONS[module.type];
                  return editingModuleId === module._id ? (
                    <li key={module._id} className="bg-paper/40 px-5 py-5">
                      <ModuleEditorForm
                        programId={programId}
                        existingModule={module}
                        onDone={() => setEditingModuleId(null)}
                      />
                    </li>
                  ) : (
                    <li key={module._id} className="flex items-center gap-3.5 px-5 py-3.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                        <Icon size={15} strokeWidth={1.9} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink">
                          <span className="tabular-nums text-muted">{i + 1}.</span> {module.title}
                        </p>
                        <p className="text-[12.5px] text-muted">{MODULE_META[module.type]?.label}</p>
                      </div>
                      <StatusBadge status={module.status} />
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => setEditingModuleId(module._id)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Trash2}
                          aria-label={`Delete ${module.title}`}
                          className="text-fail hover:bg-fail-soft"
                          onClick={() => deleteModule({ programId, moduleId: module._id })}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelHeader title={`Enrolled students (${roster.length})`} />
            {roster.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No one enrolled yet"
                description={
                  published
                    ? 'Students will appear here once they enroll.'
                    : 'Publish the program so students can enroll.'
                }
              />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Student</Th>
                    <Th>Progress</Th>
                    <Th className="text-right">Score</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((enrollment) => (
                    <Tr key={enrollment._id}>
                      <Td className="font-medium">{enrollment.student?.email}</Td>
                      <Td className="w-40">
                        <ProgressBar
                          value={enrollment.completedModules}
                          total={enrollment.totalModules}
                        />
                      </Td>
                      <Td className="text-right">
                        <ScorePill
                          score={enrollment.overallScorePct}
                          threshold={program.passCriteria?.minOverallScorePct ?? 70}
                        />
                      </Td>
                      <Td>
                        <StatusBadge status={enrollment.status} />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>
        </div>

        <Panel className="h-fit">
          <PanelHeader title="Pass criteria" description="Applied when a student finishes every module." />
          <div className="px-5 py-5">
            <Field
              label="Minimum overall score"
              hint="The average across all modules a student needs to pass this program."
            >
              {(a) => (
                <Input
                  {...a}
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={program.passCriteria?.minOverallScorePct ?? 70}
                  onBlur={(e) =>
                    updateTraining({
                      programId,
                      passCriteria: { minOverallScorePct: Number(e.target.value) },
                    })
                  }
                />
              )}
            </Field>
            <p className="mt-3 text-[12.5px] text-muted">Saved when you click away from the field.</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
