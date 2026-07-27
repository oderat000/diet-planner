import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";

/**
 * argon2id at the OWASP-recommended second-choice profile (19 MiB, 2 passes). Memory-hard,
 * so a leaked database can't be cracked cheaply on GPUs the way bcrypt can.
 *
 * Next 16's Proxy and route handlers both default to the Node.js runtime, so the native
 * module is fine here — the old "must be edge-compatible, so use bcryptjs" constraint no
 * longer applies. @node-rs/argon2 ships prebuilt binaries for Vercel's linux-x64-gnu.
 */
const ARGON_OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return argonHash(password, ARGON_OPTS);
}

export async function verifyPassword(storedHash: string, password: string): Promise<boolean> {
  try {
    return await argonVerify(storedHash, password, ARGON_OPTS);
  } catch {
    // Malformed hash in the database — treat as a failed login, never as a pass.
    return false;
  }
}

/**
 * A dummy hash of a random password, verified against whenever the account doesn't exist.
 * Without this, "unknown email" returns in ~1 ms and "wrong password" in ~50 ms, which
 * leaks the entire user list to anyone with a stopwatch.
 */
let decoyHash: Promise<string> | null = null;
export async function burnPasswordTime(password: string): Promise<void> {
  decoyHash ??= hashPassword(randomBytes(24).toString("hex"));
  await argonVerify(await decoyHash, password, ARGON_OPTS).catch(() => false);
}

/** 256 bits from the CSPRNG. Long enough that guessing a live session id is not a threat. */
export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Session and verification tokens are stored *hashed*, so a database dump doesn't hand an
 * attacker working sessions. SHA-256 rather than argon2 is correct here: the input is
 * already 256 bits of entropy, so there's nothing to brute-force and we need it fast.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Emails are indexed by hash so the key space doesn't leak the address list either. */
export function hashEmail(email: string): string {
  return createHash("sha256")
    .update(normaliseEmail(email) + (process.env.AUTH_PEPPER ?? ""))
    .digest("hex");
}

/**
 * IPs in the activity log are stored hashed with a server-side pepper: enough to spot
 * "this account logged in from 40 addresses today", not enough to reconstruct someone's
 * location history if the log leaks. Under GDPR a raw IP is personal data; this isn't.
 */
export function hashIp(ip: string): string {
  return createHash("sha256")
    .update(ip + (process.env.AUTH_PEPPER ?? ""))
    .digest("hex")
    .slice(0, 32);
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
