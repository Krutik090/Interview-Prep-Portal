import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { selectCurrentUser } from '../features/auth/authSlice.js';

/** Sends each role to the landing page that's actually useful to them. */
export default function HomeRedirect() {
  const user = useSelector(selectCurrentUser);
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to={user?.onboardingCompleted ? '/dashboard' : '/onboarding'} replace />;
}
