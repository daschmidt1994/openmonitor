"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Monitor, MonitorHistory } from "@openmonitor/api-client";
import { apiClient } from "@/lib/api";
import { StatusBadge } from "@/components/status-badge";
import { ResponseTimeChart } from "@/components/response-time-chart";
import { UptimeBar } from "@/components/uptime-bar";

const RANGES = [
  { key: "1h", label: "1 hour" },
  { key: "24h", label: "24 hours" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
] as const;

export default function MonitorDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [history, setHistory] = useState<MonitorHistory | null>(null);
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("24h");
  const [loading, setLoading] = useState(true);

  async function load() {
    const [m, h] = await Promise.all([apiClient.monitors.get(params.id), apiClient.monitors.history(params.id, range)]);
    setMonitor(m);
    setHistory(h);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, range]);

  useEffect(() => {
    const interval = setInterval(() => void load(), 15_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, range]);

  async function togglePause() {
    if (!monitor) return;
    const updated = await apiClient.monitors.update(monitor.id, { active: !monitor.active });
    setMonitor(updated);
  }

  async function remove() {
    if (!monitor) return;
    if (!confirm(`Delete monitor "${monitor.name}"? This cannot be undone.`)) return;
    await apiClient.monitors.remove(monitor.id);
    router.push("/monitors");
  }

  if (loading || !monitor) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{monitor.name}</h1>
            <StatusBadge status={monitor.currentStatus} active={monitor.active} />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {monitor.type} - {monitor.target}
            {monitor.port ? `:${monitor.port}` : ""}
          </p>
          {monitor.description && <p className="text-sm text-slate-500 mt-1">{monitor.description}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={togglePause} className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm">
            {monitor.active ? "Pause" : "Resume"}
          </button>
          <button onClick={remove} className="rounded-md border border-down/40 text-down px-3 py-1.5 text-sm">
            Delete
          </button>
        </div>
      </div>

      {history && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-sm text-slate-500">Uptime ({range})</div>
            <div className="mt-1 text-2xl font-semibold">{history.uptime.uptimePercentage.toFixed(2)}%</div>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-sm text-slate-500">Checks</div>
            <div className="mt-1 text-2xl font-semibold">{history.uptime.totalChecks}</div>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-sm text-slate-500">Consecutive failures</div>
            <div className="mt-1 text-2xl font-semibold">{monitor.consecutiveFailures}</div>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-sm text-slate-500">Last check</div>
            <div className="mt-1 text-sm font-medium">{monitor.lastCheckAt ? new Date(monitor.lastCheckAt).toLocaleString() : "Never"}</div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              range === r.key ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "border border-slate-300 dark:border-slate-700"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {history && (
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-medium mb-2">Recent checks</h2>
            <UptimeBar checks={history.checks} />
          </div>
          <div>
            <h2 className="text-sm font-medium mb-2">Response time</h2>
            <ResponseTimeChart checks={history.checks} />
          </div>
          <div>
            <h2 className="text-sm font-medium mb-2">History</h2>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Time</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Response</th>
                    <th className="p-3">HTTP status</th>
                    <th className="p-3">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history.checks]
                    .reverse()
                    .slice(0, 100)
                    .map((c) => (
                      <tr key={c.id} className="border-b border-slate-100 dark:border-slate-900 last:border-0">
                        <td className="p-3 whitespace-nowrap">{new Date(c.checkedAt).toLocaleString()}</td>
                        <td className="p-3">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="p-3">{c.responseTime !== null ? `${c.responseTime} ms` : "-"}</td>
                        <td className="p-3">{c.statusCode ?? "-"}</td>
                        <td className="p-3 text-slate-500">{c.message ?? "-"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
