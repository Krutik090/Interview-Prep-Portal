import { Outlet } from 'react-router-dom';

export default function AppLayout() {
  return (
    <div className="min-h-svh">
      <header className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
        <span className="font-semibold">Interview Prep</span>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
