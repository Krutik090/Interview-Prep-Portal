import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpenCheck, Clock, Search } from 'lucide-react';
import { useListTrainingsQuery } from './trainingsApi.js';
import { useListMyEnrollmentsQuery } from '../enrollments/enrollmentsApi.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { Panel } from '../../components/ui/Panel.jsx';
import { RoundBadge, StatusBadge } from '../../components/ui/Badge.jsx';
import { EmptyState, LoadingState } from '../../components/ui/Feedback.jsx';
import { Input } from '../../components/ui/Field.jsx';
import { ROUND_META, ROUND_ORDER } from '../../components/ui/meta.js';

export default function TrainingCatalogPage() {
  const [roundType, setRoundType] = useState('');
  const [query, setQuery] = useState('');
  const { data, isLoading } = useListTrainingsQuery(roundType ? { roundType } : undefined);
  const { data: enrollmentData } = useListMyEnrollmentsQuery();

  const enrollmentByProgram = new Map(
    (enrollmentData?.enrollments ?? []).map((e) => [e.program?._id, e]),
  );

  const programs = (data?.programs ?? []).filter((p) =>
    query ? p.title.toLowerCase().includes(query.toLowerCase()) : true,
  );

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Training programs"
        description="Each program covers one interview round, with reading, a quiz, a mock interview, and a submission to practise on."
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <Input
            className="pl-9"
            placeholder="Search programs"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search programs"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setRoundType('')}
            className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${
              roundType === ''
                ? 'border-brand bg-brand text-white'
                : 'border-line-strong bg-surface text-muted hover:text-ink'
            }`}
          >
            All rounds
          </button>
          {ROUND_ORDER.map((round) => {
            const meta = ROUND_META[round];
            const selected = roundType === round;
            return (
              <button
                key={round}
                type="button"
                onClick={() => setRoundType(round)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  selected
                    ? `border-transparent ${meta.soft} ${meta.text}`
                    : 'border-line-strong bg-surface text-muted hover:text-ink'
                }`}
              >
                <span className={`size-1.5 rounded-full ${meta.dot}`} />
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading programs" />
      ) : programs.length === 0 ? (
        <Panel>
          <EmptyState
            icon={BookOpenCheck}
            title={query ? 'No programs match that search' : 'No programs published yet'}
            description={
              query
                ? 'Try a different word, or clear the search to see everything available.'
                : 'Once your placement cell publishes a program, it will appear here.'
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {programs.map((program) => {
            const enrollment = enrollmentByProgram.get(program._id);
            const meta = ROUND_META[program.roundType];
            return (
              <Link
                key={program._id}
                to={`/trainings/${program._id}`}
                className="group flex flex-col rounded-xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(20,22,31,0.04)] transition-colors hover:border-line-strong"
              >
                <span className={`mb-4 h-1 w-9 rounded-full ${meta?.dot}`} aria-hidden="true" />
                <h2 className="font-display text-[16px] font-semibold leading-snug text-ink group-hover:underline">
                  {program.title}
                </h2>
                <p className="mt-1.5 line-clamp-2 flex-1 text-[13.5px] leading-relaxed text-muted">
                  {program.description}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <RoundBadge roundType={program.roundType} />
                  {enrollment ? (
                    <StatusBadge status={enrollment.status} />
                  ) : (
                    program.estimatedDurationMins && (
                      <span className="inline-flex items-center gap-1 text-[12.5px] text-muted">
                        <Clock size={13} aria-hidden="true" />
                        {program.estimatedDurationMins} min
                      </span>
                    )
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
