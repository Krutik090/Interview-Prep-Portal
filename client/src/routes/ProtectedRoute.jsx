import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { selectAuthStatus } from '../features/auth/authSlice.js';

// AuthBootstrap (app/AuthBootstrap.jsx) resolves 'idle' to either
// 'authenticated' or 'unauthenticated' before any route renders, so this
// guard never sees a lingering 'idle' state in practice.
export default function ProtectedRoute() {
  const status = useSelector(selectAuthStatus);
  const location = useLocation();

  if (status === 'unauthenticated' || status === 'idle') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
