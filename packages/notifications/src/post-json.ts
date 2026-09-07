export async function postJson(
  url: string,
  body: unknown,
  options: { method?: string; headers?: Record<string, string>; timeoutMs?: number } = {}
): Promise<{ ok: boolean; status: number; text: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);
  try {
    const res = await fetch(url, {
      method: options.method ?? "POST",
      headers: { "Content-Type": "application/json", ...options.headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } finally {
    clearTimeout(timeout);
  }
}
