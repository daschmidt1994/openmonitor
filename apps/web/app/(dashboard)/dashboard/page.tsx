"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Monitor, MonitorStats } from "@openmonitor/api-client";
import { apiClient } from "@/lib/api";
import { StatusBadge } from "@/components/status-badge";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [statsRes, monitorsRes] = await Promise.all([
        apiClient.monitors.stats(),
        apiClient.monitors.list({ pageSize: 10, sortBy: "createdAt", sortOrder: "desc" }),
      ]);
      setStats(statsRes);
      setMonitors(monitorsRes.data);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Monitors" value={stats?.totalMonitors ?? 0} />
        <StatCard label="Up" value={stats?.up ?? 0} />
        <StatCard label="Down" value={stats?.down ?? 0} />
        <StatCard label="Paused" value={stats?.paused ?? 0} />
        <StatCard label="Avg. response" value={stats?.averageResponseTimeMs ? `${stats.averageResponseTimeMs} ms` : "-"} />
      </div>

      {stats && stats.ongoingIncidents > 0 && (
        <Link
          href="/incidents"
          className="block rounded-lg border border-down/40 bg-down/5 px-4 py-3 text-sm text-down"
        >
          {stats.ongoingIncidents} ongoing incident{stats.ongoingIncidents > 1 ? "s" : ""} - view details
        </Link>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Recent monitors</h2>
          <Link href="/monitors" className="text-sm underline">
            View all
          </Link>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
          {monitors.length === 0 && <p className="p-4 text-sm text-slate-500">No monitors yet.</p>}
          {monitors.map((m) => (
            <Link key={m.id} href={`/monitors/${m.id}`} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-900">
              <div>
                <div className="font-medium">{m.name}</div>
                <div className="text-xs text-slate-500">
                  {m.type} - {m.target}
                </div>
              </div>
              <StatusBadge status={m.currentStatus} active={m.active} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
