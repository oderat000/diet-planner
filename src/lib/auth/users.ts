import { randomBytes } from "node:crypto";
import { keys, redis } from "./redis";
import { hashEmail, hashPassword, normaliseEmail } from "./crypto";
import type { PublicUser, User } from "./types";

/** Names that would be confusing or impersonating if a user could claim them. */
const RESERVED = new Set([
  "admin", "administrator", "root", "system", "support", "help", "api", "login",
  "signup", "logout", "account", "settings", "diet-planner", "dietplanner", "me",
  "moderator", "staff", "official", "security", "billing", "null", "undefined",
]);

const USERNAME_RE = /^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])$/i;

export function validateUsername(raw: string): string | null {
  const username = raw.trim();
  if (!USERNAME_RE.test(username)) {
    return "Username must be 3–30 characters: letters, digits, hyphen or underscore, and can't start or end with a separator.";
  }
  if (RESERVED.has(username.toLowerCase())) return "That username is reserved.";
  return null;
}

export function validateEmail(raw: string): string | null {
  const email = normaliseEmail(raw);
  // Deliberately permissive — the verification email is the real check that it exists.
  if (email.length > 254 || !/^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(email)) {
    return "Enter a valid email address.";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 10) return "Password must be at least 10 characters.";
  // argon2 hashes the whole input, but an unbounded field is a cheap way to burn CPU.
  if (password.length > 256) return "Password must be at most 256 characters.";
  return null;
}

/**
 * Rejects passwords that appear in known breach corpora, via the HaveIBeenPwned range
 * API: we send the first 5 characters of the SHA-1 and check the returned suffixes
 * locally, so the password itself never leaves the server. Network failure is not a
 * reason to block a signup, so this fails open.
 */
export async function isBreachedPassword(password: string): Promise<boolean> {
  try {
    const { createHash } = await import("node:crypto");
    const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
    const res = await fetch(`https://api.pwnedpasswords.com/range/${sha1.slice(0, 5)}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;
    const suffix = sha1.slice(5);
    return (await res.text()).split("\n").some((line) => line.split(":")[0] === suffix);
  } catch {
    return false;
  }
}

function newId(): string {
  return randomBytes(16).toString("base64url");
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const id = await redis().get<string>(keys.userByEmail(hashEmail(email)));
  return id ? getUser(id) : null;
}

export async function getUser(id: string): Promise<User | null> {
  const record = await redis().hgetall<Record<string, string>>(keys.user(id));
  if (!record || !record.id) return null;
  return {
    id: record.id,
    username: record.username,
    email: record.email,
    emailHash: record.emailHash,
    passwordHash: record.passwordHash,
    emailVerified: record.emailVerified === "true",
    createdAt: record.createdAt,
    lastLoginAt: record.lastLoginAt || null,
  };
}

export async function usernameTaken(username: string): Promise<boolean> {
  return (await redis().exists(keys.userByUsername(username))) === 1;
}

/**
 * Creates the user and both lookup indexes. The email and username keys are claimed with
 * SET NX first: two simultaneous signups for the same address must not both succeed, and
 * Redis gives us that atomically where a read-then-write check would race.
 */
export async function createUser(input: {
  email: string;
  username: string;
  password: string;
}): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  const r = redis();
  const email = normaliseEmail(input.email);
  const emailHash = hashEmail(email);
  const id = newId();

  const emailClaimed = await r.set(keys.userByEmail(emailHash), id, { nx: true });
  if (emailClaimed === null) return { ok: false, error: "email-taken" };

  const usernameClaimed = await r.set(keys.userByUsername(input.username), id, { nx: true });
  if (usernameClaimed === null) {
    await r.del(keys.userByEmail(emailHash));
    return { ok: false, error: "username-taken" };
  }

  const user: User = {
    id,
    username: input.username.trim(),
    email,
    emailHash,
    passwordHash: await hashPassword(input.password),
    emailVerified: false,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  };

  await r.hset(keys.user(id), { ...user, emailVerified: "false", lastLoginAt: "" });
  return { ok: true, user };
}

export async function markEmailVerified(userId: string): Promise<void> {
  await redis().hset(keys.user(userId), { emailVerified: "true" });
}

export async function recordLogin(userId: string): Promise<void> {
  await redis().hset(keys.user(userId), { lastLoginAt: new Date().toISOString() });
}

/** Strips the password hash before a user object can reach a client component. */
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}
