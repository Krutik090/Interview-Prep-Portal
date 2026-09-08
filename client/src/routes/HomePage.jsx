import { useEffect, useState } from 'react';
import { apiClient } from '../lib/apiClient.js';

// Temporary Phase 0 smoke-test page: confirms the Vite dev proxy reaches the
// Express API. Replaced by the real landing/dashboard page in later phases.
export default function HomePage() {
  const [health, setHealth] = useState('checking...');

  useEffect(() => {
    apiClient
      .get('/health')
      .then((res) => setHealth(res.data.status))
      .catch(() => setHealth('unreachable'));
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Interview Prep Platform</h1>
      <p className="text-sm text-gray-500">API health: {health}</p>
    </div>
  );
}
