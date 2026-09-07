/**
 * Parses an "expected status codes" spec like "200-299,301,302" and returns
 * whether the given code matches. Defaults to the 2xx range when unset.
 */
export function statusCodeMatches(code: number, spec?: string | null): boolean {
  const trimmed = (spec ?? "200-299").trim();
  if (!trimmed) return code >= 200 && code < 300;

  return trimmed.split(",").some((part) => {
    const token = part.trim();
    if (!token) return false;
    if (token.includes("-")) {
      const [from, to] = token.split("-").map((n) => parseInt(n.trim(), 10));
      if (Number.isNaN(from) || Number.isNaN(to)) return false;
      return code >= from && code <= to;
    }
    const single = parseInt(token, 10);
    return !Number.isNaN(single) && single === code;
  });
}
