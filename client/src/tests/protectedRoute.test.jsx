import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import authReducer from '../features/auth/authSlice.js';
import ProtectedRoute from '../routes/ProtectedRoute.jsx';

function renderWithAuthStatus(status) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { user: null, accessToken: null, status } },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Login page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('ProtectedRoute', () => {
  it('redirects to /login when unauthenticated', () => {
    renderWithAuthStatus('unauthenticated');
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('renders the protected content when authenticated', () => {
    renderWithAuthStatus('authenticated');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
