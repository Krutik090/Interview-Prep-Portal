import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import AuthLayout from '../components/layout/AuthLayout.jsx';
import LoginPage from '../features/auth/LoginPage.jsx';
import RegisterPage from '../features/auth/RegisterPage.jsx';
import OnboardingWizard from '../features/onboarding/OnboardingWizard.jsx';
import StudentOverviewPage from '../features/dashboard/StudentOverviewPage.jsx';
import ProfilePage from '../features/profile/ProfilePage.jsx';
import TrainingCatalogPage from '../features/trainings/TrainingCatalogPage.jsx';
import TrainingDetailPage from '../features/trainings/TrainingDetailPage.jsx';
import GroomingListPage from '../features/grooming/GroomingListPage.jsx';
import GroomingDetailPage from '../features/grooming/GroomingDetailPage.jsx';
import ResumePage from '../features/resume/ResumePage.jsx';
import AdminDashboardPage from '../features/admin/AdminDashboardPage.jsx';
import ProgramsPage from '../features/admin/ProgramsPage.jsx';
import ProgramManagePage from '../features/admin/ProgramManagePage.jsx';
import GdReviewQueuePage from '../features/admin/GdReviewQueuePage.jsx';
import AdminStudentsPage from '../features/admin/AdminStudentsPage.jsx';
import AdminGroomingPage from '../features/grooming/AdminGroomingPage.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import RequireOnboarding from './RequireOnboarding.jsx';
import RoleRoute from './RoleRoute.jsx';
import HomeRedirect from './HomeRedirect.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        {/* Onboarding runs full-screen — no sidebar until setup is done. */}
        <Route path="/onboarding" element={<OnboardingWizard />} />

        <Route element={<AppLayout />}>
          <Route path="/" element={<HomeRedirect />} />

          {/* Admin accounts skip the student onboarding gate entirely. */}
          <Route element={<RoleRoute allow={['admin']} />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/trainings" element={<ProgramsPage />} />
            <Route path="/admin/trainings/:programId" element={<ProgramManagePage />} />
            <Route path="/admin/gd-queue" element={<GdReviewQueuePage />} />
            <Route path="/admin/grooming" element={<AdminGroomingPage />} />
            <Route path="/admin/students" element={<AdminStudentsPage />} />
          </Route>

          <Route element={<RequireOnboarding />}>
            <Route path="/dashboard" element={<StudentOverviewPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/trainings" element={<TrainingCatalogPage />} />
            <Route path="/trainings/:programId" element={<TrainingDetailPage />} />
            <Route path="/grooming" element={<GroomingListPage />} />
            <Route path="/grooming/:id" element={<GroomingDetailPage />} />
            <Route path="/resume" element={<ResumePage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
