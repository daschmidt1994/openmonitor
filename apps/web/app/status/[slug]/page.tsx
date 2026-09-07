import { notFound } from "next/navigation";
import type { PublicStatusPage } from "@openmonitor/api-client";

// Server-side rendering happens inside the `web` container, which cannot
// reach the API via the browser-facing NEXT_PUBLIC_API_BASE_URL (e.g.
// "http://localhost:3001" only makes sense from the visitor's machine).
// API_INTERNAL_URL is a server-only env var pointing at the API's address
// on the Docker network (see docker-compose.yml: "http://api:3001"), and
// falls back to the public URL for non-containerized local development
// where both run on the host and share localhost.
const API_BASE_URL = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

async function getPage(slug: string): Promise<PublicStatusPage | null> {
  const res = await fetch(`${API_BASE_URL}/api/v1/status-pages/public/${slug}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load status page");
  return res.json();
}

function statusColor(status: string) {
  if (status === "UP") return "bg-up";
  if (status === "DOWN") return "bg-down";
  return "bg-pending";
}

export default async function PublicStatusPageView({ params }: { params: { slug: string } }) {
  const page = await getPage(params.slug);
  if (!page) notFound();

  const overallUp = page.monitors.every((m) => m.currentStatus === "UP");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="text-center space-y-2">
          {page.logoUrl && <img src={page.logoUrl} alt="" className="mx-auto h-12" />}
          <h1 className="text-2xl font-semibold">{page.name}</h1>
          {page.description && <p className="text-sm text-slate-500">{page.description}</p>}
          <div
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${
              overallUp ? "bg-up/10 text-up" : "bg-down/10 text-down"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${overallUp ? "bg-up" : "bg-down"}`} />
            {overallUp ? "All systems operational" : "Some systems are experiencing issues"}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
          {page.monitors
            .sort((a, b) => a.order - b.order)
            .map((m) => (
              <div key={m.id} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{m.name}</span>
                  <span className="flex items-center gap-2 text-sm">
                    <span className={`h-2 w-2 rounded-full ${statusColor(m.currentStatus)}`} />
                    {m.currentStatus === "UP" ? "Operational" : m.currentStatus === "DOWN" ? "Down" : "Pending"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Uptime (24h): {m.uptime24h.toFixed(2)}%
                  {m.averageResponseTimeMs !== null && ` - Avg response: ${m.averageResponseTimeMs}ms`}
                </div>
                {m.incidents.filter((i) => i.status === "ONGOING").length > 0 && (
                  <div className="mt-2 text-xs text-down">
                    {m.incidents
                      .filter((i) => i.status === "ONGOING")
                      .map((i) => (
                        <div key={i.id}>{i.message ?? "Ongoing incident"}</div>
                      ))}
                  </div>
                )}
              </div>
            ))}
        </div>

        <p className="text-center text-xs text-slate-400">Powered by OpenMonitor</p>
      </div>
    </div>
  );
}
