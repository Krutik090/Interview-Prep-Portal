import { useGetDashboardStatsQuery, useGetAiUsageQuery } from './adminApi.js';

export default function AdminStatsPage() {
  const { data: statsData, isLoading: loadingStats } = useGetDashboardStatsQuery();
  const { data: usageData, isLoading: loadingUsage } = useGetAiUsageQuery();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <section className="grid grid-cols-2 gap-3">
        {loadingStats ? (
          <p>Loading...</p>
        ) : (
          Object.entries(statsData.stats).map(([key, value]) => (
            <div key={key} className="rounded border border-gray-200 p-3 text-sm dark:border-gray-800">
              <p className="text-gray-500">{key}</p>
              <p className="text-xl font-semibold">{value}</p>
            </div>
          ))
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">AI usage</h2>
        {loadingUsage ? (
          <p>Loading...</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="py-1">Operation</th>
                <th>Status</th>
                <th>Count</th>
                <th>Avg latency (ms)</th>
              </tr>
            </thead>
            <tbody>
              {usageData.usage.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-900">
                  <td className="py-1">{row.operation}</td>
                  <td>{row.status}</td>
                  <td>{row.count}</td>
                  <td>{row.avgLatencyMs ?? '—'}</td>
                </tr>
              ))}
              {usageData.usage.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-2 text-gray-500">
                    No AI calls logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
