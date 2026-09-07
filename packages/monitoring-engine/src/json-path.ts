/**
 * Minimal JSONPath-lite resolver supporting dot notation and numeric array
 * indices, e.g. "data.items[0].status" or "$.data.status". Intentionally
 * small in scope (no wildcards/filters) to avoid pulling in a full JSONPath
 * engine for the common "one field, one expected value" use case.
 */
export function resolveJsonPath(payload: unknown, path: string): unknown {
  const normalized = path.trim().replace(/^\$\.?/, "");
  if (!normalized) return payload;

  const tokens = normalized
    .split(".")
    .flatMap((segment) => {
      const matches = [...segment.matchAll(/([^[\]]+)|\[(\d+)\]/g)];
      return matches.map((m) => m[1] ?? Number(m[2]));
    });

  let current: unknown = payload;
  for (const token of tokens) {
    if (current === null || current === undefined) return undefined;
    if (typeof token === "number") {
      if (!Array.isArray(current)) return undefined;
      current = current[token];
    } else {
      if (typeof current !== "object") return undefined;
      current = (current as Record<string, unknown>)[token];
    }
  }
  return current;
}
