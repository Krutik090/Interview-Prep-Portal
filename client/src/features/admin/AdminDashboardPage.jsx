import { Award, MessagesSquare, TrendingUp, Users } from 'lucide-react';
import { useGetDashboardStatsQuery, useGetAiUsageQuery } from './adminApi.js';
import { useListGdQueueQuery } from '../submissions/submissionsApi.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import { Panel, PanelHeader } from '../../components/ui/Panel.jsx';
import { Table, Th, Td, Tr } from '../../components/ui/Table.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { EmptyState, LoadingState, SkeletonRows } from '../../components/ui/Feedback.jsx';

const AI_OPERATION_LABEL = {
  profile_summary: 'Profile summary',
  training_recommend: 'Training recommendation',
  interview_question_gen: 'Interview questions',
  interview_evaluate: 'Answer evaluation',
  content_draft: 'Content draft',
  gd_review_assist: 'Review assist',
  resume_polish: 'Resume writing',
  performance_tips: 'Performance tips',
  grooming_personalize: 'Grooming personalization',
};

const AI_STATUS_TONE = { success: 'pass', error: 'fail', rate_limited: 'pending', fallback: 'pending' };
const AI_STATUS_LABEL = {
  success: 'Succeeded',
  error: 'Failed',
  rate_limited: 'Rate limited',
  fallback: 'Used fallback',
};

export default function AdminDashboardPage() {
  const { data: statsData, isLoading: loadingStats } = useGetDashboardStatsQuery();
  const { data: usageData, isLoading: loadingUsage } = useGetAiUsageQuery();
  const { data: queueData } = useListGdQueueQuery();

  const stats = statsData?.stats;
  const pending = queueData?.submissions?.length ?? 0;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Dashboard"
        description="Cohort progress and how the AI features are performing."
        actions={
          pending > 0 && (
            <ButtonLink to="/admin/gd-queue" icon={MessagesSquare}>
              Review {pending} submission{pending === 1 ? '' : 's'}
            </ButtonLink>
          )
        }
      />

      {loadingStats ? (
        <SkeletonRows rows={2} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Students" value={stats.totalStudents} icon={Users} />
          <StatCard label="Enrollments" value={stats.totalEnrollments} icon={TrendingUp} tone="aptitude" />
          <StatCard
            label="Pass rate"
            value={`${stats.passRate}%`}
            sublabel="Across all completed enrollments"
            icon={Award}
            tone="pass"
          />
          <StatCard
            label="Awaiting review"
            value={stats.pendingGdReviews}
            sublabel={stats.pendingGdReviews > 0 ? 'Submissions need your verdict' : 'Nothing in the queue'}
            icon={MessagesSquare}
            tone={stats.pendingGdReviews > 0 ? 'pending' : 'brand'}
          />
        </div>
      )}

      <Panel className="mt-6">
        <PanelHeader
          title="AI activity"
          description="Every Gemini call the app has made, grouped by what it was doing."
        />
        {loadingUsage ? (
          <LoadingState />
        ) : usageData.usage.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No AI calls yet"
            description="Once students complete onboarding or run mock interviews, activity shows up here."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Operation</Th>
                <Th>Outcome</Th>
                <Th className="text-right">Calls</Th>
                <Th className="text-right">Avg response</Th>
              </tr>
            </thead>
            <tbody>
              {usageData.usage.map((row, i) => (
                <Tr key={i}>
                  <Td className="font-medium">
                    {AI_OPERATION_LABEL[row.operation] ?? row.operation}
                  </Td>
                  <Td>
                    <Badge tone={AI_STATUS_TONE[row.status] ?? 'neutral'}>
                      {AI_STATUS_LABEL[row.status] ?? row.status}
                    </Badge>
                  </Td>
                  <Td className="text-right tabular-nums">{row.count}</Td>
                  <Td className="text-right tabular-nums text-muted">
                    {row.avgLatencyMs ? `${row.avgLatencyMs} ms` : '—'}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
