"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonitorCheck } from "@openmonitor/api-client";

export function ResponseTimeChart({ checks }: { checks: MonitorCheck[] }) {
  const data = checks
    .filter((c) => c.responseTime !== null)
    .map((c) => ({
      time: new Date(c.checkedAt).getTime(),
      responseTime: c.responseTime,
    }));

  if (data.length === 0) {
    return <p className="text-sm text-slate-500">No response time data for this range yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <XAxis
          dataKey="time"
          tickFormatter={(v) => new Date(v).toLocaleTimeString()}
          tick={{ fontSize: 11 }}
          minTickGap={40}
        />
        <YAxis tick={{ fontSize: 11 }} width={40} unit="ms" />
        <Tooltip
          labelFormatter={(v) => new Date(v as number).toLocaleString()}
          formatter={(value: number) => [`${value} ms`, "Response time"]}
        />
        <Line type="monotone" dataKey="responseTime" stroke="#2563eb" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
