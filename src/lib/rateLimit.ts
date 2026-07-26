import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Per-IP cap on the Gemini-backed routes, so a scraper hammering the public endpoint
 * can't run up the bill on its own. Backed by Upstash Redis because Vercel functions
 * are stateless — an in-memory counter would reset on every cold start and wouldn't be
 * shared across concurrent instances.
 *
 * Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (from a free Upstash database,
 * https://console.upstash.com) as Vercel env vars. If unset, rate limiting is skipped
 * rather than failing closed — better to run without a cap than to break the feature.
 */
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 h"),
      prefix: "diet-planner",
    })
  : null;

/** Best-effort caller IP from the headers Vercel's edge network sets. */
function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function checkRateLimit(req: Request): Promise<{ ok: true } | { ok: false; retryAfterSeconds: number }> {
  if (!ratelimit) return { ok: true };

  const { success, reset } = await ratelimit.limit(clientIp(req));
  if (success) return { ok: true };
  return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((reset - Date.now()) / 1000)) };
}
