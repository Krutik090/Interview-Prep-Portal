import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { selectAuthStatus } from '../features/auth/authSlice.js';

// Phase 1 should add an app-boot session check (GET /auth/me) that sets
// status to 'authenticated'/'unauthenticated' before routes render, so 'idle'
// here doesn't flash a redirect on a page refresh with a still-valid session.
export default function ProtectedRoute() {
  const status = useSelector(selectAuthStatus);
  const location = useLocation();

  if (status === 'unauthenticated' || status === 'idle') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
