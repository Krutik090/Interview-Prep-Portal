import { NavLink } from 'react-router-dom';
import {
  BookOpenCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  Sparkles,
  UserRound,
  Users,
  X,
} from 'lucide-react';

const STUDENT_NAV = [
  {
    section: 'Prepare',
    items: [
      { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/trainings', label: 'Training programs', icon: BookOpenCheck },
      { to: '/grooming', label: 'Grooming guides', icon: Sparkles },
    ],
  },
  {
    section: 'You',
    items: [
      { to: '/resume', label: 'Resume', icon: FileText },
      { to: '/profile', label: 'Profile', icon: UserRound },
    ],
  },
];

const ADMIN_NAV = [
  {
    section: 'Overview',
    items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    section: 'Manage',
    items: [
      { to: '/admin/trainings', label: 'Training programs', icon: BookOpenCheck },
      { to: '/admin/grooming', label: 'Grooming content', icon: Sparkles },
    ],
  },
  {
    section: 'Review',
    items: [
      { to: '/admin/gd-queue', label: 'Submission queue', icon: MessagesSquare, badgeKey: 'gdQueue' },
      { to: '/admin/students', label: 'Students', icon: Users },
    ],
  },
];

function NavItem({ item, badge, onNavigate }) {
  const { to, label, icon: Icon, end } = item;
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors ${
          isActive ? 'bg-white/12 text-white' : 'text-white/62 hover:bg-white/6 hover:text-white/90'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            aria-hidden="true"
            className={`absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-white transition-opacity ${
              isActive ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
          <span className="flex-1 truncate">{label}</span>
          {badge > 0 && (
            <span className="rounded-full bg-pending px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ role, user, badges = {}, onLogout, open, onClose }) {
  const nav = role === 'admin' ? ADMIN_NAV : STUDENT_NAV;
  const initials = (user?.email ?? '?').slice(0, 2).toUpperCase();

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col bg-brand transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/12 text-white">
            <GraduationCap size={19} strokeWidth={1.9} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block font-display text-[15px] font-semibold leading-tight text-white">
              Placement Prep
            </span>
            <span className="block truncate text-[11.5px] leading-tight text-white/55">
              {role === 'admin' ? 'Admin workspace' : 'Interview readiness'}
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="ml-auto text-white/60 hover:text-white lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {nav.map((group) => (
            <div key={group.section} className="mb-5">
              <p className="px-3 pb-1.5 text-[11.5px] font-medium text-white/40">{group.section}</p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <NavItem
                    key={item.to}
                    item={item}
                    badge={item.badgeKey ? badges[item.badgeKey] : 0}
                    onNavigate={onClose}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/12 text-[12px] font-semibold text-white">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-white">{user?.email}</span>
              <span className="block text-[11.5px] capitalize text-white/50">{role}</span>
            </span>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Log out"
              title="Log out"
              className="rounded-md p-1.5 text-white/55 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut size={16} strokeWidth={1.9} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
