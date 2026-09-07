"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Incident } from "@openmonitor/api-client";
import { apiClient } from "@/lib/api";

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await apiClient.incidents.list({ pageSize: 100 });
      setIncidents(res.data);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Incidents</h1>

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
          {incidents.length === 0 && <p className="p-4 text-sm text-slate-500">No incidents recorded yet.</p>}
          {incidents.map((incident) => {
            const durationMs = (incident.resolvedAt ? new Date(incident.resolvedAt).getTime() : Date.now()) - new Date(incident.startedAt).getTime();
            return (
              <div key={incident.id} className="p-4">
                <div className="flex items-center justify-between">
                  <Link href={`/monitors/${incident.monitorId}`} className="font-medium hover:underline">
                    {incident.monitor?.name ?? incident.monitorId}
                  </Link>
                  <span
                    className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${
                      incident.status === "ONGOING" ? "bg-down/10 text-down" : "bg-up/10 text-up"
                    }`}
                  >
                    {incident.status === "ONGOING" ? "Ongoing" : "Resolved"}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">{incident.message ?? "No error message recorded"}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Started {new Date(incident.startedAt).toLocaleString()} - Duration {formatDuration(durationMs)}
                  {incident.resolvedAt && ` - Resolved ${new Date(incident.resolvedAt).toLocaleString()}`}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
