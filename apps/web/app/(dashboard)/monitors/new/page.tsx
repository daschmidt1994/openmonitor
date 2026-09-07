"use client";

import { useRouter } from "next/navigation";
import { MonitorForm, type MonitorFormValues } from "@/components/monitor-form";
import { apiClient } from "@/lib/api";

export default function NewMonitorPage() {
  const router = useRouter();

  async function handleSubmit(values: MonitorFormValues) {
    const monitor = await apiClient.monitors.create({
      ...values,
      port: values.port ? Number(values.port) : undefined,
    });
    router.push(`/monitors/${monitor.id}`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">New monitor</h1>
      <MonitorForm onSubmit={handleSubmit} submitLabel="Create monitor" />
    </div>
  );
}
