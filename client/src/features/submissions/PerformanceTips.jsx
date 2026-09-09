import { useEffect, useState } from 'react';
import { useGetPerformanceTipsQuery } from './submissionsApi.js';

// Tips are generated asynchronously after grading — poll briefly until
// ready, then stop (avoids polling forever if generation silently fails).
// This effect is synchronizing with the RTK Query polling subscription
// (an external system), which is the case React's own docs carve out for
// setState-in-effect — there is no render-time way to derive "should we
// keep polling" from the polling result itself.
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
    <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="font-medium">Tips for next time</p>
      <p className="text-gray-600 dark:text-gray-400">{data.performanceTips.text}</p>
    </div>
  );
}
