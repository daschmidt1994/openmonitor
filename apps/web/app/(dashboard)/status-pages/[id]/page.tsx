"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Monitor, StatusPage } from "@openmonitor/api-client";
import { apiClient } from "@/lib/api";

export default function ManageStatusPage() {
  const params = useParams<{ id: string }>();
  const [page, setPage] = useState<StatusPage | null>(null);
  const [allMonitors, setAllMonitors] = useState<Monitor[]>([]);
  const [selectedMonitorId, setSelectedMonitorId] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  async function load() {
    const [p, monitorsRes] = await Promise.all([apiClient.statusPages.get(params.id), apiClient.monitors.list({ pageSize: 200 })]);
    setPage(p);
    setIsPublic(p.isPublic);
    setAllMonitors(monitorsRes.data);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function addMonitor(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMonitorId) return;
    await apiClient.statusPages.addMonitor(params.id, selectedMonitorId);
    setSelectedMonitorId("");
    await load();
  }

  async function removeMonitor(monitorId: string) {
    await apiClient.statusPages.removeMonitor(params.id, monitorId);
    await load();
  }

  async function togglePublic() {
    const updated = await apiClient.statusPages.update(params.id, { isPublic: !isPublic });
    setIsPublic(updated.isPublic);
  }

  if (!page) return <p className="text-sm text-slate-500">Loading...</p>;

  const attachedIds = new Set(page.monitors?.map((m) => m.monitorId));
  const available = allMonitors.filter((m) => !attachedIds.has(m.id));

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">{page.name}</h1>
        <p className="text-sm text-slate-500">/status/{page.slug}</p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isPublic} onChange={togglePublic} />
        Publicly accessible without login
      </label>

      <div>
        <h2 className="text-sm font-medium mb-2">Monitors on this page</h2>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
          {(page.monitors ?? []).length === 0 && <p className="p-4 text-sm text-slate-500">No monitors added yet.</p>}
          {(page.monitors ?? []).map((m) => (
            <div key={m.monitorId} className="flex items-center justify-between p-3">
              <span className="text-sm">{m.monitor.name}</span>
              <button onClick={() => removeMonitor(m.monitorId)} className="text-sm text-down hover:underline">
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={addMonitor} className="flex gap-2">
        <select
          value={selectedMonitorId}
          onChange={(e) => setSelectedMonitorId(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
        >
          <option value="">Select a monitor to add...</option>
          {available.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 py-2 text-sm font-medium">
          Add
        </button>
      </form>
    </div>
  );
}
