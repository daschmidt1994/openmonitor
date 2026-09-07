"use client";

import { useEffect, useState } from "react";
import { ApiScope } from "@openmonitor/shared";
import type { ApiToken } from "@openmonitor/api-client";
import { ApiClientError } from "@openmonitor/api-client";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await apiClient.auth.changePassword({ currentPassword, newPassword });
      setMessage("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body?.message ?? err.message : "Failed to change password");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-slate-200 dark:border-slate-800 p-4 max-w-md">
      <h2 className="text-sm font-semibold">Change password</h2>
      {error && <div className="rounded-md bg-down/10 px-3 py-2 text-sm text-down">{error}</div>}
      {message && <div className="rounded-md bg-up/10 px-3 py-2 text-sm text-up">{message}</div>}
      <div>
        <label className="block text-sm font-medium mb-1">Current password</label>
        <input
          type="password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">New password</label>
        <input
          type="password"
          required
          minLength={10}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
        />
      </div>
      <button className="rounded-md bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 py-2 text-sm font-medium">Change password</button>
    </form>
  );
}

function ApiTokensSection() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<ApiScope[]>([ApiScope.MONITORS_READ]);
  const [newToken, setNewToken] = useState<string | null>(null);

  async function load() {
    setTokens(await apiClient.apiTokens.list());
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const created = await apiClient.apiTokens.create({ name, scopes });
    setNewToken(created.token);
    setName("");
    await load();
  }

  async function revoke(id: string) {
    await apiClient.apiTokens.revoke(id);
    await load();
  }

  function toggleScope(scope: ApiScope) {
    setScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h2 className="text-sm font-semibold">API tokens</h2>
      {newToken && (
        <div className="rounded-md bg-up/10 px-3 py-2 text-sm">
          <p className="font-medium text-up">Copy your new token now - it will not be shown again:</p>
          <code className="block mt-1 break-all">{newToken}</code>
        </div>
      )}
      <form onSubmit={create} className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-wrap gap-3">
          {Object.values(ApiScope).map((scope) => (
            <label key={scope} className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" checked={scopes.includes(scope)} onChange={() => toggleScope(scope)} />
              {scope}
            </label>
          ))}
        </div>
        <button className="rounded-md bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 py-2 text-sm font-medium">Create token</button>
      </form>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
        {tokens.length === 0 && <p className="p-4 text-sm text-slate-500">No API tokens yet.</p>}
        {tokens.map((t) => (
          <div key={t.id} className="flex items-center justify-between p-3">
            <div>
              <div className="text-sm font-medium">{t.name}</div>
              <div className="text-xs text-slate-500">
                {t.tokenPrefix}... - {t.scopes.join(", ")} {t.revokedAt && "- revoked"}
              </div>
            </div>
            {!t.revokedAt && (
              <button onClick={() => revoke(t.id)} className="text-sm text-down underline">
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-10">
      <h1 className="text-xl font-semibold">Settings</h1>

      <div className="text-sm text-slate-500">
        Signed in as <span className="font-medium text-slate-900 dark:text-slate-100">{user?.email}</span> ({user?.role})
      </div>

      <ChangePasswordForm />
      <ApiTokensSection />
    </div>
  );
}
