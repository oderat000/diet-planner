/**
 * Caller identity and rate-limit plumbing, resolved the same way everywhere.
 *
 * This lived in four places with two different answers, which meant the AI routes were
 * rate-limited on a value the caller controls while the auth routes were not.
 */

/**
 * Best-effort caller IP.
 *
 * `x-forwarded-for` is appended to by every hop, so its leftmost entry is whatever the
 * original caller claimed it was — a scraper can reset its own rate-limit bucket by
 * sending a new one each request. Vercel's edge network sets `x-real-ip` itself and
 * strips inbound copies, so prefer that; fall back to the forwarded chain only for
 * environments that don't set it.
 *
 * Takes a header accessor rather than a `Request` or `Headers`, because callers arrive
 * holding both: route handlers have a `Request`, Server Actions have `await headers()`.
 */
export function clientIpFromHeaders(get: (name: string) => string | null): string {
  const real = get("x-real-ip");
  if (real) return real.trim();

  const forwarded = get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }

  return "unknown";
}

/** Convenience for route handlers, which hold a `Request`. */
export function clientIpFromRequest(req: Request): string {
  return clientIpFromHeaders((name) => req.headers.get(name));
}

export type LimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

/** Upstash reports an absolute reset timestamp; callers need seconds-from-now. */
export function retryAfterSeconds(reset: number): number {
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}
