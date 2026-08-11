import { keys, redis } from "./redis";
import { hashToken, randomToken } from "./crypto";

const RESET_TOKEN_TTL_SECONDS = 20 * 60;

export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = randomToken();
  const key = keys.passwordReset(hashToken(token));
  const r = redis();
  await r.hset(key, { userId, createdAt: new Date().toISOString() });
  await r.expire(key, RESET_TOKEN_TTL_SECONDS);
  return token;
}

export async function consumePasswordResetToken(token: string): Promise<string | null> {
  const key = keys.passwordReset(hashToken(token));
  const r = redis();
  const userId = await r.hget<string>(key, "userId");
  if (!userId) return null;
  await r.del(key);
  return userId;
}
