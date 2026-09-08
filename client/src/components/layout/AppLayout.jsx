import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentUser, loggedOut } from '../../features/auth/authSlice.js';
import { useLogoutMutation } from '../../features/auth/authApi.js';

export default function AppLayout() {
  const user = useSelector(selectCurrentUser);
  const [logout] = useLogoutMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    dispatch(loggedOut());
    navigate('/login');
  }

  return (
    <div className="min-h-svh">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
        <Link to="/" className="font-semibold">
          Interview Prep
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {user?.role === 'student' && (
            <>
              <Link to="/dashboard">Profile</Link>
              <Link to="/trainings">Trainings</Link>
            </>
          )}
          {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
          {user ? (
            <button onClick={handleLogout} className="underline">
              Log out
            </button>
          ) : (
            <Link to="/login">Log in</Link>
          )}
        </nav>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
