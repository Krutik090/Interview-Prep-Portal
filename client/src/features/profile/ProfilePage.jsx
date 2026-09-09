import { useState } from 'react';
import { GraduationCap, Pencil, RefreshCw, Sparkles, Target } from 'lucide-react';
import { useGetMyProfileQuery, useRefreshAiSummaryMutation } from './profileApi.js';
import ProfileEditForm from './ProfileEditForm.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { Panel, PanelHeader } from '../../components/ui/Panel.jsx';
import Button from '../../components/ui/Button.jsx';
import { Badge, RoundBadge } from '../../components/ui/Badge.jsx';
import { ErrorState, LoadingState } from '../../components/ui/Feedback.jsx';

function TagList({ items, empty }) {
  if (!items?.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item} tone="brand">
          {item}
        </Badge>
      ))}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line/70 py-2.5 last:border-0">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="text-sm font-medium text-ink">{value || '—'}</dd>
    </div>
  );
}

export default function ProfilePage() {
  const { data, isLoading, error, refetch } = useGetMyProfileQuery();
  const [refreshAiSummary, { isLoading: refreshing }] = useRefreshAiSummaryMutation();
  const [editing, setEditing] = useState(false);

  if (isLoading) return <LoadingState />;
  if (error)
    return (
      <ErrorState
        title="Could not load your profile"
        description="Check your connection and try again."
        onRetry={refetch}
      />
    );

  const { profile } = data;

  if (editing) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Edit profile" description="Changes apply to your resume and recommendations." />
        <Panel className="p-6">
          <ProfileEditForm profile={profile} onDone={() => setEditing(false)} />
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={profile.fullName || 'Your profile'}
        description="What we use to tailor recommendations and build your resume."
        actions={
          <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
            Edit profile
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-5">
          <Panel>
            <PanelHeader title="Education" />
            <dl className="px-5 py-2">
              <DetailRow label="Degree" value={profile.education?.degree} />
              <DetailRow label="Institution" value={profile.education?.institution} />
              <DetailRow label="Branch" value={profile.education?.branch} />
              <DetailRow label="Graduating" value={profile.education?.graduationYear} />
            </dl>
          </Panel>

          <Panel>
            <PanelHeader title="Target" />
            <dl className="px-5 py-2">
              <DetailRow label="Role" value={profile.targetRole} />
              <DetailRow label="Domain" value={profile.targetDomain} />
              <DetailRow label="Experience" value={profile.experienceLevel} />
            </dl>
            <div className="border-t border-line px-5 py-4">
              <p className="mb-2 text-[13px] font-medium text-muted">Companies you&apos;re aiming for</p>
              <TagList items={profile.preferredCompanies} empty="None added yet." />
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-5">
          <Panel>
            <PanelHeader
              title="Where to focus"
              description={
                profile.aiSummary?.model === 'rule-based-fallback'
                  ? 'Written from your answers.'
                  : 'Written from your setup answers.'
              }
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  icon={RefreshCw}
                  onClick={() => refreshAiSummary()}
                  disabled={refreshing}
                >
                  {refreshing ? 'Queued' : 'Refresh'}
                </Button>
              }
            />
            <div className="px-5 py-4">
              {profile.aiSummary?.text ? (
                <>
                  <p className="max-w-[68ch] text-sm leading-relaxed text-ink/85">
                    {profile.aiSummary.text}
                  </p>
                  {profile.aiSummary.suggestedTracks?.length > 0 && (
                    <div className="mt-3.5">
                      <p className="mb-2 text-[13px] font-medium text-muted">Suggested rounds</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.aiSummary.suggestedTracks.map((track) => (
                          <RoundBadge key={track} roundType={track} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Sparkles size={15} aria-hidden="true" />
                  Still being written — refresh this page in a moment.
                </p>
              )}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Skills and strengths" />
            <div className="flex flex-col gap-4 px-5 py-4">
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-muted">
                  <GraduationCap size={14} aria-hidden="true" /> Skills
                </p>
                <TagList items={profile.currentSkills} empty="No skills added yet." />
              </div>
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-muted">
                  <Target size={14} aria-hidden="true" /> Strengths
                </p>
                <TagList items={profile.strengths} empty="None added yet." />
              </div>
              <div>
                <p className="mb-2 text-[13px] font-medium text-muted">Working on</p>
                <TagList items={profile.weaknesses} empty="None added yet." />
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
