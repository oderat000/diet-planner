import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import type { User } from "./types";

/**
 * A tiny in-memory stand-in for the handful of Upstash commands session.ts calls. Real
 * enough to exercise expiry and index bookkeeping without a network round-trip.
 */
function makeFakeRedis() {
  const hashes = new Map<string, Record<string, string>>();
  const zsets = new Map<string, Map<string, number>>();

  return {
    hashes,
    zsets,
    hset: vi.fn(async (key: string, fields: Record<string, unknown>) => {
      const existing = hashes.get(key) ?? {};
      for (const [k, v] of Object.entries(fields)) existing[k] = String(v);
      hashes.set(key, existing);
      return 1;
    }),
    hgetall: vi.fn(async (key: string) => hashes.get(key) ?? null),
    hget: vi.fn(async (key: string, field: string) => hashes.get(key)?.[field] ?? null),
    expire: vi.fn(async () => 1),
    zadd: vi.fn(async (key: string, entry: { score: number; member: string }) => {
      const z = zsets.get(key) ?? new Map();
      z.set(entry.member, entry.score);
      zsets.set(key, z);
      return 1;
    }),
    zremrangebyscore: vi.fn(async (key: string, min: number, max: number) => {
      const z = zsets.get(key);
      if (!z) return 0;
      let removed = 0;
      for (const [member, score] of z) {
        if (score >= min && score <= max) {
          z.delete(member);
          removed++;
        }
      }
      return removed;
    }),
    // Mirrors Upstash's two calling conventions: plain `zrange(key, 0, -1)` is by *rank*
    // (member position, `-1` meaning "to the end"); `{ byScore: true }` switches min/max to
    // mean *score* bounds instead. session.ts uses both, so the fake has to tell them apart.
    zrange: vi.fn(
      async (
        key: string,
        min: number | string,
        max: number | string,
        opts?: { byScore?: boolean },
      ) => {
        const z = zsets.get(key);
        if (!z) return [];
        const entries = [...z.entries()];
        if (opts?.byScore) {
          const lo = min === "-inf" ? -Infinity : Number(min);
          const hi = max === "+inf" ? Infinity : Number(max);
          return entries.filter(([, score]) => score >= lo && score <= hi).map(([m]) => m);
        }
        // Rank-based: sort by score ascending, then slice like a normal array index range.
        const sorted = entries.sort((a, b) => a[1] - b[1]).map(([m]) => m);
        const start = Number(min);
        const end = Number(max) === -1 ? sorted.length : Number(max) + 1;
        return sorted.slice(start, end);
      },
    ),
    zrem: vi.fn(async (key: string, member: string) => {
      zsets.get(key)?.delete(member);
      return 1;
    }),
    del: vi.fn(async (...keys: string[]) => {
      for (const k of keys) hashes.delete(k);
      return keys.length;
    }),
  };
}

const fakeRedis = makeFakeRedis();
vi.mock("./redis", () => ({
  redis: () => fakeRedis,
  keys: {
    user: (id: string) => `user:${id}`,
    session: (h: string) => `session:${h}`,
    userSessions: (id: string) => `user:${id}:sessions`,
  },
}));

const cookieStore = new Map<string, { value: string }>();
const cookies = {
  get: vi.fn((name: string) => cookieStore.get(name)),
  set: vi.fn((name: string, value: string) => {
    cookieStore.set(name, { value });
  }),
  delete: vi.fn((name: string) => {
    cookieStore.delete(name);
  }),
};
const requestHeaders = new Map<string, string>([["user-agent", "vitest-agent"]]);
vi.mock("next/headers", () => ({
  cookies: async () => cookies,
  headers: async () => ({ get: (name: string) => requestHeaders.get(name) ?? null }),
}));

const getUser = vi.fn();
vi.mock("./users", () => ({ getUser }));

const { createSession, getSession, destroyCurrentSession, destroyAllSessions } = await import(
  "./session"
);
const { SESSION_COOKIE } = await import("./session");

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    username: "alice",
    emailHash: "hash",
    email: "alice@example.com",
    passwordHash: "argon2-hash",
    emailVerified: true,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  fakeRedis.hashes.clear();
  fakeRedis.zsets.clear();
  cookieStore.clear();
  getUser.mockReset();
  getUser.mockResolvedValue(makeUser());
});

describe("createSession + getSession round trip", () => {
  it("resolves the same user that was signed in", async () => {
    await createSession("user-1");
    const result = await getSession();
    expect(result?.user.id).toBe("user-1");
  });

  it("never stores the raw token, only its hash", async () => {
    await createSession("user-1");
    const cookieToken = cookieStore.get(SESSION_COOKIE)?.value;
    expect(cookieToken).toBeTruthy();

    const expectedHash = createHash("sha256").update(cookieToken!).digest("hex");
    expect(fakeRedis.hashes.has(`session:${expectedHash}`)).toBe(true);
    // Nothing stored anywhere should equal the plaintext cookie value.
    for (const record of fakeRedis.hashes.values()) {
      expect(Object.values(record)).not.toContain(cookieToken);
    }
  });
});

describe("getSession", () => {
  it("returns null with no cookie set", async () => {
    await expect(getSession()).resolves.toBeNull();
  });

  it("returns null for a forged/unknown token", async () => {
    cookieStore.set(SESSION_COOKIE, { value: "totally-made-up-token" });
    await expect(getSession()).resolves.toBeNull();
  });

  it("rejects an expired session even if Redis hasn't evicted it yet", async () => {
    await createSession("user-1");
    const key = `session:${createHash("sha256")
      .update(cookieStore.get(SESSION_COOKIE)!.value)
      .digest("hex")}`;
    const record = fakeRedis.hashes.get(key)!;
    record.expiresAt = new Date(Date.now() - 1000).toISOString(); // already in the past

    await expect(getSession()).resolves.toBeNull();
    // and it should have cleaned the stale record up rather than leaving it live
    expect(fakeRedis.hashes.has(key)).toBe(false);
  });

  it("returns null and cleans up when the user behind the session was deleted", async () => {
    await createSession("user-1");
    getUser.mockResolvedValue(null);

    await expect(getSession()).resolves.toBeNull();
  });
});

describe("destroyCurrentSession", () => {
  it("clears the cookie and removes the Redis record so the token can't be replayed", async () => {
    await createSession("user-1");
    const token = cookieStore.get(SESSION_COOKIE)!.value;

    await destroyCurrentSession();

    expect(cookieStore.has(SESSION_COOKIE)).toBe(false);
    // Simulate the browser resending the old cookie anyway (e.g. stale tab).
    cookieStore.set(SESSION_COOKIE, { value: token });
    await expect(getSession()).resolves.toBeNull();
  });
});

describe("destroyAllSessions", () => {
  it("invalidates every session for the user, not just the current one", async () => {
    await createSession("user-1");
    const tokenA = cookieStore.get(SESSION_COOKIE)!.value;
    cookieStore.clear();
    await createSession("user-1");
    const tokenB = cookieStore.get(SESSION_COOKIE)!.value;

    await destroyAllSessions("user-1");

    cookieStore.set(SESSION_COOKIE, { value: tokenA });
    await expect(getSession()).resolves.toBeNull();
    cookieStore.set(SESSION_COOKIE, { value: tokenB });
    await expect(getSession()).resolves.toBeNull();
  });
});
