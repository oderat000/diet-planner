import { Ratelimit } from "@upstash/ratelimit";
import { headers } from "next/headers";
import { redis } from "./redis";
import { hashEmail } from "./crypto";

/**
 * Rate limits on the auth endpoints. Without these, the login form is an online password
 * guesser and the signup form is a free email cannon pointed at strangers.
 *
 * Two dimensions, both enforced: per account (stops credential stuffing against one
 * victim) and per IP (stops one host spraying many accounts). A distributed attack can
 * still evade the IP limit, which is why the per-account limit is the important one.
 */
function limiter(name: string, tokens: number, window: `${number} ${"s" | "m" | "h"}`) {
  return new Ratelimit({
    redis: redis(),
    limiter: Ratelimit.slidingWindow(tokens, window),
    prefix: `dp-auth:${name}`,
    analytics: false,
  });
}

let cached: Record<string, Ratelimit> | null = null;
function limiters() {
  cached ??= {
    loginIp: limiter("login-ip", 20, "15 m"),
    loginAccount: limiter("login-account", 5, "15 m"),
    signupIp: limiter("signup-ip", 5, "1 h"),
    emailSend: limiter("email-send", 3, "1 h"),
  };
  return cached;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  // Vercel appends the true client IP; the leftmost entry is caller-controlled, so on
  // Vercel prefer x-real-ip, which the platform sets itself.
  return h.get("x-real-ip") ?? (forwarded ? forwarded.split(",")[0].trim() : "unknown");
}

export type LimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

async function check(rl: Ratelimit, key: string): Promise<LimitResult> {
  const { success, reset } = await rl.limit(key);
  if (success) return { ok: true };
  return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((reset - Date.now()) / 1000)) };
}

export async function limitLogin(email: string): Promise<LimitResult> {
  const l = limiters();
  const byIp = await check(l.loginIp, await clientIp());
  if (!byIp.ok) return byIp;
  // Keyed on the email hash, so the limiter's own keyspace doesn't hold addresses.
  return check(l.loginAccount, hashEmail(email));
}

export async function limitSignup(): Promise<LimitResult> {
  return check(limiters().signupIp, await clientIp());
}

export async function limitEmailSend(email: string): Promise<LimitResult> {
  return check(limiters().emailSend, hashEmail(email));
}
