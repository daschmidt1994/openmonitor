"use client";

import { useEffect, useState } from "react";
import type { SystemInfo, SystemSettings, User } from "@openmonitor/api-client";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function AdminPage() {
  const { user } = useAuth();
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  async function load() {
    const [i, s, u] = await Promise.all([apiClient.system.info(), apiClient.system.getSettings(), apiClient.users.list({ pageSize: 100 })]);
    setInfo(i);
    setSettings(s);
    setUsers(u.data);
  }

  useEffect(() => {
    if (user?.role === "ADMIN") void load();
  }, [user]);

  async function toggleRegistration() {
    if (!settings) return;
    const updated = await apiClient.system.updateSettings({ registrationEnabled: !settings.registrationEnabled });
    setSettings(updated);
  }

  async function toggleActive(target: User) {
    await apiClient.users.update(target.id, { active: !target.active });
    await load();
  }

  async function setRole(target: User, role: "ADMIN" | "USER" | "READONLY") {
    await apiClient.users.update(target.id, { role });
    await load();
  }

  async function removeUser(target: User) {
    if (!confirm(`Delete user "${target.username}"? This cannot be undone.`)) return;
    await apiClient.users.remove(target.id);
    await load();
  }

  if (user?.role !== "ADMIN") {
    return <p className="text-sm text-slate-500">You do not have access to this page.</p>;
  }

  return (
    <div className="space-y-10">
      <h1 className="text-xl font-semibold">Admin</h1>

      {info && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-sm text-slate-500">Version</div>
            <div className="mt-1 font-medium">{info.version}</div>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-sm text-slate-500">Users</div>
            <div className="mt-1 font-medium">{info.userCount}</div>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-sm text-slate-500">Monitors</div>
            <div className="mt-1 font-medium">{info.monitorCount}</div>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-sm text-slate-500">Checks (24h)</div>
            <div className="mt-1 font-medium">{info.checksLast24h}</div>
          </div>
        </div>
      )}

      {settings && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.registrationEnabled} onChange={toggleRegistration} />
          Allow self-registration
        </label>
      )}

      <div>
        <h2 className="text-sm font-medium mb-2">Users</h2>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-3 gap-4">
              <div>
                <div className="text-sm font-medium">{u.username}</div>
                <div className="text-xs text-slate-500">{u.email}</div>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={u.role}
                  onChange={(e) => setRole(u, e.target.value as "ADMIN" | "USER" | "READONLY")}
                  disabled={u.id === user.id}
                  className="rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-2 py-1 text-xs"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="USER">USER</option>
                  <option value="READONLY">READONLY</option>
                </select>
                <button
                  onClick={() => toggleActive(u)}
                  disabled={u.id === user.id}
                  className={`text-xs underline ${u.active ? "text-down" : "text-up"}`}
                >
                  {u.active ? "Deactivate" : "Activate"}
                </button>
                <button onClick={() => removeUser(u)} disabled={u.id === user.id} className="text-xs text-down underline">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
