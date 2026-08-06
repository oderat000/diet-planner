import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { clientIpFromRequest, retryAfterSeconds, type LimitResult } from "./clientIp";

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

export async function checkRateLimit(req: Request): Promise<LimitResult> {
  if (!ratelimit) return { ok: true };

  const { success, reset } = await ratelimit.limit(clientIpFromRequest(req));
  if (success) return { ok: true };
  return { ok: false, retryAfterSeconds: retryAfterSeconds(reset) };
}
