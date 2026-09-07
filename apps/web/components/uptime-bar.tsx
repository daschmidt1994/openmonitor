"use client";

import type { MonitorCheck } from "@openmonitor/api-client";

/** A simple heartbeat-style bar of the most recent checks, à la Uptime Kuma. */
export function UptimeBar({ checks, max = 50 }: { checks: MonitorCheck[]; max?: number }) {
  const recent = checks.slice(-max);
  return (
    <div className="flex items-end gap-0.5 h-10">
      {recent.map((c) => (
        <div
          key={c.id}
          title={`${new Date(c.checkedAt).toLocaleString()} - ${c.status}${c.message ? `: ${c.message}` : ""}`}
          className={`w-2 flex-1 rounded-sm ${c.status === "UP" ? "bg-up" : c.status === "DOWN" ? "bg-down" : "bg-pending"}`}
          style={{ height: "100%" }}
        />
      ))}
      {recent.length === 0 && <p className="text-sm text-slate-500">No checks yet.</p>}
    </div>
  );
}
