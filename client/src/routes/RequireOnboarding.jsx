import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';
import { selectCurrentUser } from '../features/auth/authSlice.js';

// Forces a first-time-logged-in student through the onboarding questionnaire
// before reaching any other protected page.
export default function RequireOnboarding() {
  const user = useSelector(selectCurrentUser);

  if (user && !user.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
