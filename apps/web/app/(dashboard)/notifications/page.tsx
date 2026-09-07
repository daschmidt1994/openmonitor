"use client";

import { useEffect, useState } from "react";
import { NotificationType } from "@openmonitor/shared";
import type { NotificationProvider } from "@openmonitor/api-client";
import { ApiClientError } from "@openmonitor/api-client";
import { apiClient } from "@/lib/api";

const CONFIG_HINTS: Record<NotificationType, string> = {
  [NotificationType.EMAIL]: '{"host":"smtp.example.com","port":587,"secure":false,"username":"...","password":"...","fromAddress":"alerts@example.com","toAddress":"you@example.com"}',
  [NotificationType.DISCORD]: '{"webhookUrl":"https://discord.com/api/webhooks/..."}',
  [NotificationType.SLACK]: '{"webhookUrl":"https://hooks.slack.com/services/..."}',
  [NotificationType.TELEGRAM]: '{"botToken":"123:abc","chatId":"123456789"}',
  [NotificationType.WEBHOOK]: '{"url":"https://example.com/hook"}',
};

export default function NotificationsPage() {
  const [providers, setProviders] = useState<NotificationProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [type, setType] = useState<NotificationType>(NotificationType.WEBHOOK);
  const [config, setConfig] = useState(CONFIG_HINTS[NotificationType.WEBHOOK]);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  async function load() {
    const res = await apiClient.notifications.list();
    setProviders(res);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createProvider(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const parsedConfig = JSON.parse(config);
      await apiClient.notifications.create({ name, type, config: parsedConfig });
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body?.message ?? err.message : err instanceof Error ? err.message : "Failed to create provider");
    }
  }

  async function remove(id: string) {
    await apiClient.notifications.remove(id);
    await load();
  }

  async function test(id: string) {
    setTestResult(null);
    try {
      await apiClient.notifications.test(id);
      setTestResult("Test notification sent successfully.");
    } catch (err) {
      setTestResult(err instanceof ApiClientError ? `Failed: ${err.body?.message ?? err.message}` : "Test failed");
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-xl font-semibold">Notification providers</h1>

      <form onSubmit={createProvider} className="space-y-4 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
        <h2 className="text-sm font-semibold">Add a provider</h2>
        {error && <div className="rounded-md bg-down/10 px-3 py-2 text-sm text-down">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => {
                const t = e.target.value as NotificationType;
                setType(t);
                setConfig(CONFIG_HINTS[t]);
              }}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            >
              {Object.values(NotificationType).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Config (JSON)</label>
          <textarea
            required
            rows={3}
            value={config}
            onChange={(e) => setConfig(e.target.value)}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono"
          />
        </div>
        <button className="rounded-md bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 py-2 text-sm font-medium">Add provider</button>
      </form>

      {testResult && <div className="rounded-md bg-slate-100 dark:bg-slate-900 px-3 py-2 text-sm">{testResult}</div>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
          {providers.length === 0 && <p className="p-4 text-sm text-slate-500">No notification providers configured yet.</p>}
          {providers.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-slate-500">{p.type}</div>
              </div>
              <div className="flex gap-3 text-sm">
                <button onClick={() => test(p.id)} className="underline">
                  Send test
                </button>
                <button onClick={() => remove(p.id)} className="text-down underline">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-500">
        Attach a provider to a monitor from the monitor&apos;s detail page settings via the API (POST
        /api/v1/monitors/:id/notifications/:providerId) - a dedicated UI for this is on the roadmap.
      </p>
    </div>
  );
}
