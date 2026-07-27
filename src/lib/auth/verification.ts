import { keys, redis } from "./redis";
import { hashToken, randomToken } from "./crypto";

const TOKEN_TTL_SECONDS = 30 * 60;

/**
 * Issues a single-use email-verification token. Only its hash is stored, and only for
 * 30 minutes — a link sitting in an inbox forever is a standing account takeover.
 * Returns the raw token, which goes in the email and is never persisted anywhere.
 */
export async function createVerificationToken(userId: string): Promise<string> {
  const token = randomToken();
  const r = redis();
  await r.hset(keys.verification(hashToken(token)), {
    userId,
    createdAt: new Date().toISOString(),
  });
  await r.expire(keys.verification(hashToken(token)), TOKEN_TTL_SECONDS);
  return token;
}

/**
 * Consumes a token. Deleting before returning makes it single-use even if the link is
 * clicked twice (mail scanners routinely prefetch links), and closes the window where two
 * concurrent requests could both redeem it.
 */
export async function consumeVerificationToken(token: string): Promise<string | null> {
  const key = keys.verification(hashToken(token));
  const r = redis();
  const userId = await r.hget<string>(key, "userId");
  if (!userId) return null;
  await r.del(key);
  return userId;
}
