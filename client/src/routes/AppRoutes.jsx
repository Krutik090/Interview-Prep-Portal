import { Routes, Route } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import HomePage from './HomePage.jsx';
import LoginPage from '../features/auth/LoginPage.jsx';
import RegisterPage from '../features/auth/RegisterPage.jsx';
import OnboardingWizard from '../features/onboarding/OnboardingWizard.jsx';
import ProfilePage from '../features/profile/ProfilePage.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import RequireOnboarding from './RequireOnboarding.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<OnboardingWizard />} />

          <Route element={<RequireOnboarding />}>
            <Route path="/dashboard" element={<ProfilePage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
