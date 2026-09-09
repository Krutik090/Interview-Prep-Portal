import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Menu } from 'lucide-react';
import { selectCurrentUser, loggedOut } from '../../features/auth/authSlice.js';
import { useLogoutMutation } from '../../features/auth/authApi.js';
import { useListGdQueueQuery } from '../../features/submissions/submissionsApi.js';
import Sidebar from './Sidebar.jsx';

export default function AppLayout() {
  const user = useSelector(selectCurrentUser);
  const [logout] = useLogoutMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);

  // Admins get a live count of what's waiting on them, so the sidebar
  // itself says whether there's work to do.
  const { data: gdQueue } = useListGdQueueQuery(undefined, { skip: user?.role !== 'admin' });

  async function handleLogout() {
    await logout();
    dispatch(loggedOut());
    navigate('/login');
  }

  return (
    <div className="min-h-svh bg-paper">
      <Sidebar
        role={user?.role}
        user={user}
        badges={{ gdQueue: gdQueue?.submissions?.length ?? 0 }}
        onLogout={handleLogout}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-paper/85 px-4 backdrop-blur-sm sm:px-6 lg:hidden">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
            className="rounded-lg border border-line-strong bg-surface p-2 text-ink"
          >
            <Menu size={18} strokeWidth={1.9} />
          </button>
          <span className="font-display text-[15px] font-semibold">Placement Prep</span>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
