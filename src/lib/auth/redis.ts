import { Redis } from "@upstash/redis";

/**
 * Shared Upstash client for everything auth-related: users, sessions, one-time tokens
 * and the activity log all live here.
 *
 * Unlike the rate limiter in src/lib/rateLimit.ts — which degrades to "no cap" when the
 * credentials are missing — auth fails *closed*. A missing database must never be
 * mistaken for "this request is authorised", so every call site treats a null client as
 * a hard error rather than quietly letting the request through.
 */
const client =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

/** True when auth is configured. Used to render a clear "not set up" message instead of a crash. */
export const authConfigured = client !== null;

export function redis(): Redis {
  if (!client) {
    throw new Error(
      "Auth requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN. See .env.example.",
    );
  }
  return client;
}

/**
 * Key layout. Redis has no queries, so every lookup we need must have its own key or
 * index written at the same time as the record itself:
 *
 *   user:<id>                 hash   the user record
 *   user:email:<sha256>       string user id — login by email, and signup uniqueness
 *   user:username:<lower>     string user id — signup uniqueness, profile URLs
 *   session:<tokenHash>       hash   session record, TTL'd to its own expiry
 *   user:<id>:sessions        zset   session token hashes by expiry — "log out everywhere"
 *   verify:<tokenHash>        hash   pending email verification, 30 min TTL
 *   reset:<tokenHash>         hash   pending password reset, 20 min TTL
 *   activity:user:<id>        zset   this user's events by timestamp
 *   activity:all              zset   every event by timestamp, for the admin view
 *   activity:event:<id>       string the event JSON itself
 */
export const keys = {
  user: (id: string) => `user:${id}`,
  userByEmail: (emailHash: string) => `user:email:${emailHash}`,
  userByUsername: (username: string) => `user:username:${username.toLowerCase()}`,
  session: (tokenHash: string) => `session:${tokenHash}`,
  userSessions: (id: string) => `user:${id}:sessions`,
  verification: (tokenHash: string) => `verify:${tokenHash}`,
  passwordReset: (tokenHash: string) => `reset:${tokenHash}`,
  activityUser: (id: string) => `activity:user:${id}`,
  activityAll: () => "activity:all",
  activityEvent: (eventId: string) => `activity:event:${eventId}`,
};
