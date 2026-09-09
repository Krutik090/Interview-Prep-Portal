import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { GraduationCap } from 'lucide-react';
import { useRefreshMutation } from '../features/auth/authApi.js';
import { credentialsSet, loggedOut } from '../features/auth/authSlice.js';

// On app load the access token only lives in memory (Redux), so a page
// refresh loses it — this silently exchanges the httpOnly refresh cookie
// (if any) for a fresh access token before any route renders, so an
// existing session survives a reload instead of bouncing to /login.
export default function AuthBootstrap({ children }) {
  const [refresh] = useRefreshMutation();
  const dispatch = useDispatch();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    refresh().then((result) => {
      if (cancelled) return;
      if (result.data) {
        dispatch(credentialsSet(result.data));
      } else {
        dispatch(loggedOut());
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-paper">
        <div className="flex items-center gap-2.5 opacity-70">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand text-white">
            <GraduationCap size={19} strokeWidth={1.9} aria-hidden="true" />
          </span>
          <span className="font-display text-[15px] font-semibold">Placement Prep</span>
        </div>
      </div>
    );
  }

  return children;
}
