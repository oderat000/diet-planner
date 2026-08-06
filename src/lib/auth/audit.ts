import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { keys, redis } from "./redis";
import { hashIp } from "./crypto";
import { clientIpFromHeaders } from "../clientIp";
import type { ActivityEvent, ActivityRecord } from "./types";

/**
 * How long events are kept. "Track all activity" has to stop somewhere: an unbounded log
 * of what people eat and when they sign in is a liability, not an asset. 90 days covers
 * incident investigation and abuse patterns, which is the stated purpose.
 */
const RETENTION_DAYS = 90;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

/** Redis has no TTL on individual zset members, so old ones are trimmed opportunistically. */
const TRIM_PROBABILITY = 0.02;

/**
 * Records one thing a user did.
 *
 * Always call this on the server, from inside the Server Action or route handler that
 * performs the action — never from a client component and never from a value the browser
 * sent. A client-reported event is an event the client can forge or omit; this is the
 * difference between an audit log and a wish list.
 *
 * Never throws: a failed write must not roll back the action the user actually asked for.
 *
 *   await auditLog("plan.generated", { userId, sessionId, targetType: "plan", targetId: plan.id });
 */
export async function auditLog(
  event: ActivityEvent,
  opts: {
    userId?: string | null;
    sessionId?: string | null;
    targetType?: string | null;
    targetId?: string | null;
    /**
     * Small scalar detail only — a plan id, a count, an error code. Do NOT put dish
     * photos, free-text questions, weights or anything else health-related here: under
     * GDPR that is special-category data, and a 90-day log of it needs a lawful basis
     * this app doesn't have.
     */
    metadata?: Record<string, string | number | boolean> | null;
  } = {},
): Promise<void> {
  try {
    const h = await headers();
    const ip = clientIpFromHeaders((name) => h.get(name));

    const record: ActivityRecord = {
      id: `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}`,
      userId: opts.userId ?? null,
      sessionId: opts.sessionId ?? null,
      event,
      targetType: opts.targetType ?? null,
      targetId: opts.targetId ?? null,
      metadata: opts.metadata ?? null,
      ipHash: hashIp(ip), // peppered hash, not the address itself
      userAgent: (h.get("user-agent") ?? "unknown").slice(0, 256),
      createdAt: new Date().toISOString(),
    };

    const now = Date.now();
    const r = redis();
    // The event body expires on its own; the index entries are trimmed below.
    await r.set(keys.activityEvent(record.id), JSON.stringify(record), {
      ex: RETENTION_DAYS * 24 * 60 * 60,
    });
    await r.zadd(keys.activityAll(), { score: now, member: record.id });
    if (record.userId) {
      await r.zadd(keys.activityUser(record.userId), { score: now, member: record.id });
    }

    if (Math.random() < TRIM_PROBABILITY) {
      const cutoff = now - RETENTION_MS;
      await r.zremrangebyscore(keys.activityAll(), 0, cutoff);
      if (record.userId) await r.zremrangebyscore(keys.activityUser(record.userId), 0, cutoff);
    }
  } catch {
    // Swallowed on purpose — see the note above.
  }
}

async function hydrate(ids: string[]): Promise<ActivityRecord[]> {
  if (ids.length === 0) return [];
  const raw = await redis().mget<(string | ActivityRecord | null)[]>(
    ...ids.map(keys.activityEvent),
  );
  return raw
    .map((entry) => {
      if (!entry) return null; // body expired ahead of its index entry
      return typeof entry === "string" ? (JSON.parse(entry) as ActivityRecord) : entry;
    })
    .filter((entry): entry is ActivityRecord => entry !== null);
}

/** One user's history, newest first. Backs the "your activity" page. */
export async function readUserActivity(userId: string, limit = 100): Promise<ActivityRecord[]> {
  const ids = await redis().zrange<string[]>(keys.activityUser(userId), -limit, -1);
  return (await hydrate(ids)).reverse();
}

/** Site-wide feed, newest first. Only ever render this behind an admin check. */
export async function readAllActivity(limit = 200): Promise<ActivityRecord[]> {
  const ids = await redis().zrange<string[]>(keys.activityAll(), -limit, -1);
  return (await hydrate(ids)).reverse();
}

/** GDPR erasure: drop everything recorded about one user. */
export async function deleteUserActivity(userId: string): Promise<number> {
  const r = redis();
  const ids = await r.zrange<string[]>(keys.activityUser(userId), 0, -1);
  if (ids.length) {
    await r.del(...ids.map(keys.activityEvent));
    await r.zrem(keys.activityAll(), ...ids);
  }
  await r.del(keys.activityUser(userId));
  return ids.length;
}
