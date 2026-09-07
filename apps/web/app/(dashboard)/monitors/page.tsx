"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Monitor } from "@openmonitor/api-client";
import { apiClient } from "@/lib/api";
import { StatusBadge } from "@/components/status-badge";

export default function MonitorsPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const res = await apiClient.monitors.list({ pageSize: 100, search: search || undefined });
    setMonitors(res.data);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Monitors</h1>
        <Link href="/monitors/new" className="rounded-md bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 py-2 text-sm font-medium">
          New monitor
        </Link>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
        className="flex gap-2"
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search monitors..."
          className="w-full max-w-sm rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm">
          Search
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
          {monitors.length === 0 && <p className="p-4 text-sm text-slate-500">No monitors found.</p>}
          {monitors.map((m) => (
            <Link key={m.id} href={`/monitors/${m.id}`} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-900">
              <div>
                <div className="font-medium">{m.name}</div>
                <div className="text-xs text-slate-500">
                  {m.type} - {m.target}
                  {m.port ? `:${m.port}` : ""} - every {m.interval}s
                </div>
              </div>
              <div className="flex items-center gap-3">
                {m.tags.map(({ tag }) => (
                  <span key={tag.id} className="text-xs rounded-full px-2 py-0.5" style={{ backgroundColor: `${tag.color}22`, color: tag.color }}>
                    {tag.name}
                  </span>
                ))}
                <StatusBadge status={m.currentStatus} active={m.active} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
