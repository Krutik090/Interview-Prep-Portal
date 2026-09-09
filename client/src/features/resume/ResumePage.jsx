import { useState } from 'react';
import {
  useGetResumeEligibilityQuery,
  useGenerateResumeMutation,
  useGetResumeStatusQuery,
} from './resumeApi.js';
import { apiClient } from '../../lib/apiClient.js';

export default function ResumePage() {
  const { data: eligibility, isLoading: loadingEligibility } = useGetResumeEligibilityQuery();
  const [generateResume, { isLoading: generating }] = useGenerateResumeMutation();
  const { data: statusData, refetch } = useGetResumeStatusQuery(undefined, {
    pollingInterval: 3000,
  });
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
      setDownloadError('Could not download resume.');
    } finally {
      setDownloading(false);
    }
  }

  if (loadingEligibility) return <p>Loading...</p>;

  const resume = statusData?.resume;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Resume</h1>

      {!eligibility.eligible ? (
        <p className="text-sm text-gray-500">
          Pass at least one training program to unlock resume generation.
        </p>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            Passed programs: {eligibility.passedProgramTitles.join(', ')}
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating || resume?.status === 'generating'}
            className="self-start rounded bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
          >
            {resume?.status === 'generating' ? 'Generating...' : 'Generate resume'}
          </button>

          {resume?.status === 'ready' && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="self-start rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 disabled:opacity-50"
            >
              {downloading ? 'Downloading...' : 'Download PDF'}
            </button>
          )}
          {downloadError && <p className="text-sm text-red-600">{downloadError}</p>}
          {resume?.status === 'failed' && (
            <p className="text-sm text-red-600">Resume generation failed — try again.</p>
          )}
        </>
      )}
    </div>
  );
}
