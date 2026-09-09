import { useState } from 'react';
import { Download, FileText, Lock, RefreshCw } from 'lucide-react';
import {
  useGetResumeEligibilityQuery,
  useGenerateResumeMutation,
  useGetResumeStatusQuery,
} from './resumeApi.js';
import { apiClient } from '../../lib/apiClient.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { Panel } from '../../components/ui/Panel.jsx';
import Button, { ButtonLink } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { EmptyState, InlineError, LoadingState, Spinner } from '../../components/ui/Feedback.jsx';

export default function ResumePage() {
  const { data: eligibility, isLoading } = useGetResumeEligibilityQuery();
  const [generateResume, { isLoading: generating }] = useGenerateResumeMutation();
  const { data: statusData, refetch } = useGetResumeStatusQuery(undefined, { pollingInterval: 3000 });
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  async function handleGenerate() {
    await generateResume();
    refetch();
  }

  async function handleDownload() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const response = await apiClient.get('/resume/download', { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'resume.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError('Could not download the file. Try generating it again.');
    } finally {
      setDownloading(false);
    }
  }

  if (isLoading) return <LoadingState />;

  const resume = statusData?.resume;
  const busy = generating || resume?.status === 'generating';

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Resume"
        description="Built from your profile and the rounds you've cleared, then written up as a PDF you can download."
      />

      {!eligibility.eligible ? (
        <Panel>
          <EmptyState
            icon={Lock}
            title="Clear a round to unlock your resume"
            description="Once you pass your first training program, we'll turn your profile and results into a formatted resume."
            action={
              <ButtonLink to="/trainings" size="sm">
                Browse programs
              </ButtonLink>
            }
          />
        </Panel>
      ) : (
        <div className="flex flex-col gap-5">
          <Panel className="p-5">
            <h2 className="text-[15px] font-semibold">What goes in</h2>
            <p className="mt-1 text-[13.5px] text-muted">
              Your profile details plus these cleared programs:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {eligibility.passedProgramTitles.map((title) => (
                <Badge key={title} tone="pass">
                  {title}
                </Badge>
              ))}
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <FileText size={19} strokeWidth={1.9} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">
                    {resume?.status === 'ready'
                      ? 'Your resume is ready'
                      : busy
                        ? 'Writing your resume'
                        : 'No resume generated yet'}
                  </p>
                  <p className="text-[12.5px] text-muted">
                    {resume?.status === 'ready'
                      ? `Version ${resume.version} · generated ${new Date(resume.generatedAt).toLocaleDateString()}`
                      : busy
                        ? 'This takes a few seconds'
                        : 'Generate it whenever you like — you can regenerate after clearing more rounds'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={resume?.status === 'ready' ? 'secondary' : 'primary'}
                  icon={busy ? undefined : RefreshCw}
                  onClick={handleGenerate}
                  disabled={busy}
                >
                  {busy ? (
                    <>
                      <Spinner /> Generating
                    </>
                  ) : resume?.status === 'ready' ? (
                    'Regenerate'
                  ) : (
                    'Generate resume'
                  )}
                </Button>
                {resume?.status === 'ready' && (
                  <Button icon={Download} onClick={handleDownload} disabled={downloading}>
                    {downloading ? 'Downloading' : 'Download PDF'}
                  </Button>
                )}
              </div>
            </div>

            {resume?.status === 'failed' && (
              <div className="mt-4">
                <InlineError>
                  Generating your resume didn&apos;t finish. Try again — if it keeps failing, tell your
                  placement coordinator.
                </InlineError>
              </div>
            )}
            {downloadError && (
              <div className="mt-4">
                <InlineError>{downloadError}</InlineError>
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
