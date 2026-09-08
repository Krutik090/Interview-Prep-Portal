import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
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

  if (!ready) return null;
  return children;
}
