"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { StatusPage } from "@openmonitor/api-client";
import { ApiClientError } from "@openmonitor/api-client";
import { apiClient } from "@/lib/api";

export default function StatusPagesPage() {
  const [pages, setPages] = useState<StatusPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    const res = await apiClient.statusPages.list();
    setPages(res);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createPage(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await apiClient.statusPages.create({ name, slug, isPublic: true });
      setName("");
      setSlug("");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.body?.message ?? err.message : "Failed to create status page");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Status pages</h1>

      <form onSubmit={createPage} className="flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Slug</label>
          <input
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
            placeholder="meine-services"
            className="rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <button disabled={creating} className="rounded-md bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-50">
          Create
        </button>
      </form>
      {error && <div className="rounded-md bg-down/10 px-3 py-2 text-sm text-down max-w-md">{error}</div>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
          {pages.length === 0 && <p className="p-4 text-sm text-slate-500">No status pages yet.</p>}
          {pages.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-slate-500">/status/{p.slug} - {p.isPublic ? "Public" : "Private"}</div>
              </div>
              <div className="flex gap-3 text-sm">
                <Link href={`/status/${p.slug}`} target="_blank" className="underline">
                  View
                </Link>
                <Link href={`/status-pages/${p.id}`} className="underline">
                  Manage
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
