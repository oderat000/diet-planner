import { cookies, headers } from "next/headers";
import { cache } from "react";
import { keys, redis } from "./redis";
import { hashIp, hashToken, randomToken } from "./crypto";
import { clientIpFromHeaders } from "../clientIp";
import { getUser } from "./users";
import type { Session, User } from "./types";

/**
 * `__Host-` is the strictest cookie prefix: browsers only accept it when it's Secure,
 * Path=/ and has no Domain, which stops a subdomain from overwriting our session cookie.
 * It requires HTTPS, so plain `dp_session` is used on http://localhost in dev.
 */
const PROD = process.env.NODE_ENV === "production";
export const SESSION_COOKIE = PROD ? "__Host-dp_session" : "dp_session";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
/** Sessions past this age get a fresh 30 days on use, so active users aren't logged out. */
const REFRESH_AFTER_SECONDS = 60 * 60 * 24 * 7;

async function requestContext(): Promise<{ ipHash: string; userAgent: string }> {
  const h = await headers();
  const ip = clientIpFromHeaders((name) => h.get(name));
  return { ipHash: hashIp(ip), userAgent: (h.get("user-agent") ?? "unknown").slice(0, 256) };
}

/**
 * Issues a session and sets the cookie. The cookie holds the raw token; Redis only ever
 * sees its SHA-256, so a database dump yields no usable sessions.
 *
 * Call this *after* authenticating, and only from a Server Action or route handler —
 * cookies can't be set while rendering.
 */
export async function createSession(userId: string): Promise<string> {
  const token = randomToken();
  const tokenHash = hashToken(token);
  const now = Date.now();
  const { ipHash, userAgent } = await requestContext();

  const session: Session = {
    id: tokenHash,
    userId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_SECONDS * 1000).toISOString(),
    ipHash,
    userAgent,
  };

  const r = redis();
  await r.hset(keys.session(tokenHash), session);
  await r.expire(keys.session(tokenHash), SESSION_TTL_SECONDS);
  // Index by expiry so "log out everywhere" can find them and so expired entries can be trimmed.
  await r.zadd(keys.userSessions(userId), { score: now + SESSION_TTL_SECONDS * 1000, member: tokenHash });
  await r.zremrangebyscore(keys.userSessions(userId), 0, now);

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, // invisible to document.cookie, so XSS can't read the session
    secure: PROD,
    sameSite: "lax", // blocks cross-site CSRF while keeping normal inbound links working
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return tokenHash;
}

/**
 * Resolves the current session from the cookie. Wrapped in React's `cache` so the many
 * `requireUser()` calls in one render share a single Redis round-trip.
 *
 * This is the real authorization check — Proxy's cookie test is only a UX shortcut.
 */
export const getSession = cache(
  async (): Promise<{ session: Session; user: User } | null> => {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const tokenHash = hashToken(token);
    const record = await redis().hgetall<Record<string, string>>(keys.session(tokenHash));
    if (!record || !record.userId) return null;

    // Redis TTL should have removed it already; check anyway rather than trusting expiry.
    if (new Date(record.expiresAt).getTime() <= Date.now()) {
      await destroySessionByHash(tokenHash, record.userId);
      return null;
    }

    const user = await getUser(record.userId);
    if (!user) {
      // User deleted while the session lived on.
      await destroySessionByHash(tokenHash, record.userId);
      return null;
    }

    const session: Session = {
      id: tokenHash,
      userId: record.userId,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      ipHash: record.ipHash,
      userAgent: record.userAgent,
    };
    return { session, user };
  },
);

/** Extends a session that's more than a week old. Safe to call from a Server Action only. */
export async function refreshSession(session: Session): Promise<void> {
  const age = Date.now() - new Date(session.createdAt).getTime();
  if (age < REFRESH_AFTER_SECONDS * 1000) return;

  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const r = redis();
  await r.hset(keys.session(session.id), { expiresAt: new Date(expiresAt).toISOString() });
  await r.expire(keys.session(session.id), SESSION_TTL_SECONDS);
  await r.zadd(keys.userSessions(session.userId), { score: expiresAt, member: session.id });
}

export async function destroySessionByHash(tokenHash: string, userId: string): Promise<void> {
  const r = redis();
  await r.del(keys.session(tokenHash));
  await r.zrem(keys.userSessions(userId), tokenHash);
}

/** Logs out the current browser and clears the cookie. */
export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    const userId = await redis().hget<string>(keys.session(tokenHash), "userId");
    if (userId) await destroySessionByHash(tokenHash, userId);
  }
  jar.delete(SESSION_COOKIE);
}

/**
 * Revokes every session for a user. This is the reason sessions are database-backed
 * rather than self-contained JWTs — with a JWT there is no way to do this before expiry.
 */
export async function destroyAllSessions(userId: string): Promise<number> {
  const r = redis();
  const hashes = await r.zrange<string[]>(keys.userSessions(userId), 0, -1);
  if (hashes.length) await r.del(...hashes.map(keys.session));
  await r.del(keys.userSessions(userId));
  return hashes.length;
}

/** Active sessions for the account page — "you're signed in on 3 devices". */
export async function listSessions(userId: string): Promise<Session[]> {
  const r = redis();
  const hashes = await r.zrange<string[]>(keys.userSessions(userId), Date.now(), "+inf", {
    byScore: true,
  });
  const records = await Promise.all(
    hashes.map((h) => r.hgetall<Record<string, string>>(keys.session(h))),
  );
  return records
    .filter((rec): rec is Record<string, string> => Boolean(rec?.userId))
    .map((rec) => ({
      id: rec.id,
      userId: rec.userId,
      createdAt: rec.createdAt,
      expiresAt: rec.expiresAt,
      ipHash: rec.ipHash,
      userAgent: rec.userAgent,
    }));
}
