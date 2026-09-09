import { Routes, Route } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import HomePage from './HomePage.jsx';
import LoginPage from '../features/auth/LoginPage.jsx';
import RegisterPage from '../features/auth/RegisterPage.jsx';
import OnboardingWizard from '../features/onboarding/OnboardingWizard.jsx';
import ProfilePage from '../features/profile/ProfilePage.jsx';
import TrainingCatalogPage from '../features/trainings/TrainingCatalogPage.jsx';
import TrainingDetailPage from '../features/trainings/TrainingDetailPage.jsx';
import GroomingListPage from '../features/grooming/GroomingListPage.jsx';
import GroomingDetailPage from '../features/grooming/GroomingDetailPage.jsx';
import AdminDashboardPage from '../features/admin/AdminDashboardPage.jsx';
import ProgramManagePage from '../features/admin/ProgramManagePage.jsx';
import GdReviewQueuePage from '../features/admin/GdReviewQueuePage.jsx';
import AdminGroomingPage from '../features/grooming/AdminGroomingPage.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import RequireOnboarding from './RequireOnboarding.jsx';
import RoleRoute from './RoleRoute.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<OnboardingWizard />} />

          {/* Admin accounts skip the student onboarding gate entirely. */}
          <Route element={<RoleRoute allow={['admin']} />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/trainings/:programId" element={<ProgramManagePage />} />
            <Route path="/admin/gd-queue" element={<GdReviewQueuePage />} />
            <Route path="/admin/grooming" element={<AdminGroomingPage />} />
          </Route>

          <Route element={<RequireOnboarding />}>
            <Route path="/dashboard" element={<ProfilePage />} />
            <Route path="/trainings" element={<TrainingCatalogPage />} />
            <Route path="/trainings/:programId" element={<TrainingDetailPage />} />
            <Route path="/grooming" element={<GroomingListPage />} />
            <Route path="/grooming/:id" element={<GroomingDetailPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
