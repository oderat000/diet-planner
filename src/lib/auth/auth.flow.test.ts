import { beforeEach, describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => {
  const strings = new Map<string, string>();
  const hashes = new Map<string, Record<string, string>>();
  return {
    strings,
    hashes,
    redis: {
      set: vi.fn(async (key: string, value: string, options?: { nx?: boolean }) => {
        if (options?.nx && strings.has(key)) return null;
        strings.set(key, value);
        return "OK";
      }),
      get: vi.fn(async (key: string) => strings.get(key) ?? null),
      exists: vi.fn(async (key: string) => (strings.has(key) || hashes.has(key) ? 1 : 0)),
      hset: vi.fn(async (key: string, fields: Record<string, unknown>) => {
        const record = hashes.get(key) ?? {};
        for (const [field, value] of Object.entries(fields)) record[field] = String(value);
        hashes.set(key, record);
        return 1;
      }),
      hgetall: vi.fn(async (key: string) => hashes.get(key) ?? null),
      hget: vi.fn(async (key: string, field: string) => hashes.get(key)?.[field] ?? null),
      expire: vi.fn(async () => 1),
      del: vi.fn(async (...keys: string[]) => {
        for (const key of keys) {
          strings.delete(key);
          hashes.delete(key);
        }
        return keys.length;
      }),
    },
  };
});

vi.mock("./redis", () => ({
  redis: () => fake.redis,
  keys: {
    user: (id: string) => `user:${id}`,
    userByEmail: (emailHash: string) => `user:email:${emailHash}`,
    userByUsername: (username: string) => `user:username:${username.toLowerCase()}`,
    passwordReset: (tokenHash: string) => `reset:${tokenHash}`,
  },
}));

const {
  authenticateUser,
  createUser,
  markEmailVerified,
  setUserPassword,
} = await import("./users");
const { createPasswordResetToken, consumePasswordResetToken } = await import("./passwordReset");

beforeEach(() => {
  fake.strings.clear();
  fake.hashes.clear();
  vi.clearAllMocks();
});

describe("account lifecycle", () => {
  it("registers a new account and logs in with its password", async () => {
    const created = await createUser({
      email: "new-user@example.com",
      username: "new-user",
      password: "initial-password-123",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await markEmailVerified(created.user.id);
    const loggedIn = await authenticateUser("NEW-USER@example.com", "initial-password-123");
    expect(loggedIn?.id).toBe(created.user.id);
    expect(loggedIn?.emailVerified).toBe(true);
    await expect(authenticateUser("new-user@example.com", "wrong-password")).resolves.toBeNull();
  });

  it("rejects duplicate email and username registrations", async () => {
    const first = await createUser({
      email: "first@example.com",
      username: "first-user",
      password: "initial-password-123",
    });
    expect(first.ok).toBe(true);
    await expect(
      createUser({
        email: "FIRST@example.com",
        username: "another-user",
        password: "initial-password-123",
      }),
    ).resolves.toEqual({ ok: false, error: "email-taken" });
    await expect(
      createUser({
        email: "other@example.com",
        username: "first-user",
        password: "initial-password-123",
      }),
    ).resolves.toEqual({ ok: false, error: "username-taken" });
  });

  it("resets the password with a one-time token", async () => {
    const created = await createUser({
      email: "reset@example.com",
      username: "reset-user",
      password: "initial-password-123",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const token = await createPasswordResetToken(created.user.id);
    expect([...fake.hashes.keys()].some((key) => key.includes(token))).toBe(false);
    await expect(consumePasswordResetToken(token)).resolves.toBe(created.user.id);
    await expect(consumePasswordResetToken(token)).resolves.toBeNull();

    await setUserPassword(created.user.id, "replacement-password-456");
    await expect(
      authenticateUser("reset@example.com", "initial-password-123"),
    ).resolves.toBeNull();
    await expect(
      authenticateUser("reset@example.com", "replacement-password-456"),
    ).resolves.toMatchObject({ id: created.user.id });
  });
});
