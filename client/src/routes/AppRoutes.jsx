import { Routes, Route } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import HomePage from './HomePage.jsx';
import LoginPage from '../features/auth/LoginPage.jsx';
import RegisterPage from '../features/auth/RegisterPage.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          {/* Student/admin protected routes are added from Phase 1 onward */}
        </Route>
      </Route>
    </Routes>
  );
}
