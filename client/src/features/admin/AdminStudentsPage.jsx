import { useState } from 'react';
import { ChevronDown, Search, Users } from 'lucide-react';
import { useListStudentsQuery, useGetStudentProgressQuery } from './adminApi.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { Panel } from '../../components/ui/Panel.jsx';
import { Input } from '../../components/ui/Field.jsx';
import { Badge, RoundBadge, StatusBadge } from '../../components/ui/Badge.jsx';
import { ProgressBar, ScorePill } from '../../components/ui/Progress.jsx';
import { EmptyState, LoadingState, Spinner } from '../../components/ui/Feedback.jsx';

function StudentProgress({ userId }) {
  const { data, isLoading } = useGetStudentProgressQuery(userId);

  if (isLoading)
    return (
      <p className="flex items-center gap-2 px-5 py-4 text-sm text-muted">
        <Spinner /> Loading progress
      </p>
    );

  const enrollments = data?.enrollments ?? [];
  if (enrollments.length === 0)
    return <p className="px-5 py-4 text-sm text-muted">Not enrolled in any program yet.</p>;

  return (
    <ul className="divide-y divide-line/70 border-t border-line bg-paper/40">
      {enrollments.map((enrollment) => (
        <li key={enrollment._id} className="flex flex-wrap items-center gap-3 px-5 py-3">
          <span className="min-w-0 flex-1 text-[13.5px] font-medium text-ink">
            {enrollment.program?.title}
          </span>
          <RoundBadge roundType={enrollment.program?.roundType} />
          <span className="w-32">
            <ProgressBar value={enrollment.completedModules} total={enrollment.totalModules} />
          </span>
          <ScorePill score={enrollment.overallScorePct} />
          <StatusBadge status={enrollment.status} />
        </li>
      ))}
    </ul>
  );
}

export default function AdminStudentsPage() {
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState(null);
  const { data, isLoading } = useListStudentsQuery(search ? { search } : undefined);

  const students = data?.students ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Students"
        description="Everyone registered, and how far they've got through their programs."
      />

      <div className="relative mb-5 w-full max-w-xs">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <Input
          className="pl-9"
          placeholder="Search by email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search students by email"
        />
      </div>

      <Panel>
        {isLoading ? (
          <LoadingState />
        ) : students.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? 'No students match that search' : 'No students registered yet'}
            description={
              search
                ? 'Try a different email, or clear the search.'
                : 'Students appear here once they create an account.'
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {students.map((student) => {
              const isOpen = openId === student._id;
              return (
                <li key={student._id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : student._id)}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-paper/70"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11.5px] font-semibold text-brand">
                      {student.email.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium text-ink">{student.email}</span>
                    <Badge tone={student.onboardingCompleted ? 'pass' : 'pending'}>
                      {student.onboardingCompleted ? 'Set up' : 'Onboarding pending'}
                    </Badge>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen && <StudentProgress userId={student._id} />}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
