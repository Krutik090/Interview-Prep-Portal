import { Link } from 'react-router-dom';
import { ArrowUpRight, BookOpenCheck, CircleCheckBig, FileText, Timer } from 'lucide-react';
import { useListMyEnrollmentsQuery } from '../enrollments/enrollmentsApi.js';
import { useGetMyProfileQuery } from '../profile/profileApi.js';
import { useListTrainingsQuery } from '../trainings/trainingsApi.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import { Panel, PanelHeader } from '../../components/ui/Panel.jsx';
import { RoundBadge, StatusBadge } from '../../components/ui/Badge.jsx';
import { ProgressBar } from '../../components/ui/Progress.jsx';
import { EmptyState, LoadingState } from '../../components/ui/Feedback.jsx';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { ROUND_META, ROUND_ORDER } from '../../components/ui/meta.js';

export default function StudentOverviewPage() {
  const { data: enrollmentData, isLoading: loadingEnrollments } = useListMyEnrollmentsQuery();
  const { data: profileData } = useGetMyProfileQuery();
  const { data: catalogData } = useListTrainingsQuery();

  const enrollments = enrollmentData?.enrollments ?? [];
  const profile = profileData?.profile;
  const passed = enrollments.filter((e) => e.status === 'passed');
  const active = enrollments.filter((e) => e.status === 'in_progress');
  const firstName = profile?.fullName?.split(' ')[0];

  // Which rounds has this student actually cleared? This is the thing a
  // student most wants to know at a glance, so it gets the most space.
  const roundState = ROUND_ORDER.map((round) => {
    const forRound = enrollments.filter((e) => e.program?.roundType === round);
    return {
      round,
      passed: forRound.filter((e) => e.status === 'passed').length,
      enrolled: forRound.length,
      available: (catalogData?.programs ?? []).filter((p) => p.roundType === round).length,
    };
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : 'Your preparation'}
        description="Your progress across the four interview rounds, and what to pick up next."
        actions={
          <ButtonLink to="/trainings" variant="secondary" icon={BookOpenCheck}>
            Browse programs
          </ButtonLink>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Programs enrolled" value={enrollments.length} icon={BookOpenCheck} />
        <StatCard label="Rounds cleared" value={passed.length} icon={CircleCheckBig} tone="pass" />
        <StatCard label="In progress" value={active.length} icon={Timer} tone="pending" />
        <StatCard
          label="Resume"
          value={passed.length > 0 ? 'Ready' : 'Locked'}
          sublabel={passed.length > 0 ? 'Generate it from the Resume page' : 'Clear one round to unlock'}
          icon={FileText}
          tone={passed.length > 0 ? 'pass' : 'brand'}
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Panel>
          <PanelHeader
            title="Your rounds"
            description="Each round tests something different. Clear them in any order."
          />
          <ul className="divide-y divide-line">
            {roundState.map(({ round, passed: p, enrolled, available }) => {
              const meta = ROUND_META[round];
              return (
                <li key={round} className="flex items-center gap-4 px-5 py-4">
                  <span className={`flex size-9 items-center justify-center rounded-lg ${meta.soft}`}>
                    <span className={`size-2.5 rounded-full ${meta.dot}`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{meta.label}</p>
                    <p className="text-[12.5px] text-muted">{meta.blurb}</p>
                  </div>
                  <div className="w-32 shrink-0 text-right">
                    {enrolled === 0 ? (
                      <Link
                        to="/trainings"
                        className={`text-[13px] font-medium ${meta.text} underline underline-offset-2`}
                      >
                        {available > 0 ? 'Start this round' : 'Nothing yet'}
                      </Link>
                    ) : (
                      <>
                        <p className="text-[13px] font-medium tabular-nums text-ink">
                          {p} of {enrolled} cleared
                        </p>
                        <div className="mt-1.5">
                          <ProgressBar value={p} total={enrolled} tone="pass" showLabel={false} />
                        </div>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel>
          <PanelHeader title="Pick up where you left off" />
          {loadingEnrollments ? (
            <LoadingState />
          ) : active.length === 0 ? (
            <EmptyState
              icon={BookOpenCheck}
              title="Nothing in progress"
              description="Enroll in a training program and your active modules will show up here."
              action={
                <ButtonLink to="/trainings" size="sm">
                  Browse programs
                </ButtonLink>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {active.map((enrollment) => (
                <li key={enrollment._id}>
                  <Link
                    to={`/trainings/${enrollment.program?._id}`}
                    className="flex flex-col gap-2.5 px-5 py-4 transition-colors hover:bg-paper/70"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-medium text-ink">{enrollment.program?.title}</span>
                      <ArrowUpRight size={15} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
                    </div>
                    <RoundBadge roundType={enrollment.program?.roundType} />
                    <ProgressBar
                      value={enrollment.completedModules}
                      total={enrollment.totalModules}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {profile?.aiSummary?.text && (
        <Panel className="mt-5">
          <PanelHeader
            title="Where to focus"
            description="Based on the answers you gave during setup."
          />
          <div className="px-5 py-4">
            <p className="max-w-[68ch] text-sm leading-relaxed text-ink/85">{profile.aiSummary.text}</p>
            {profile.aiSummary.suggestedTracks?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.aiSummary.suggestedTracks.map((track) => (
                  <RoundBadge key={track} roundType={track} />
                ))}
              </div>
            )}
          </div>
        </Panel>
      )}

      {enrollments.length > 0 && (
        <Panel className="mt-5">
          <PanelHeader title="All enrollments" />
          <ul className="divide-y divide-line">
            {enrollments.map((enrollment) => (
              <li key={enrollment._id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <Link
                  to={`/trainings/${enrollment.program?._id}`}
                  className="min-w-0 flex-1 text-sm font-medium text-ink hover:underline"
                >
                  {enrollment.program?.title}
                </Link>
                <RoundBadge roundType={enrollment.program?.roundType} />
                <span className="w-36">
                  <ProgressBar value={enrollment.completedModules} total={enrollment.totalModules} />
                </span>
                <StatusBadge status={enrollment.status} />
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
