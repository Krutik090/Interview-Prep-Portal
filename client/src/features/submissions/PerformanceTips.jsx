import { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { useGetPerformanceTipsQuery } from './submissionsApi.js';

/**
 * Tips are generated asynchronously after grading — poll briefly until
 * ready, then stop. This effect synchronizes with the RTK Query polling
 * subscription (an external system), which is the case React's own docs
 * carve out for setState-in-effect.
 */
export default function PerformanceTips({ submissionId }) {
  const [ready, setReady] = useState(false);
  const { data } = useGetPerformanceTipsQuery(submissionId, {
    skip: !submissionId || ready,
    pollingInterval: 2000,
  });

  useEffect(() => {
    if (data?.ready) setReady(true);
  }, [data?.ready]);

  if (!data?.ready) return null;

  return (
    <div className="flex gap-3 rounded-lg border border-pending/25 bg-pending-soft/60 px-4 py-3.5">
      <Lightbulb size={17} className="mt-px shrink-0 text-pending" aria-hidden="true" />
      <div>
        <p className="text-[13px] font-semibold text-ink">What to work on next</p>
        <p className="mt-1 max-w-[68ch] text-[13.5px] leading-relaxed text-ink/80">
          {data.performanceTips.text}
        </p>
      </div>
    </div>
  );
}
