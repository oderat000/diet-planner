import { beforeEach, describe, expect, it, vi } from "vitest";

const { hgetall } = vi.hoisted(() => ({ hgetall: vi.fn() }));

vi.mock("./redis", () => ({
  redis: () => ({ hgetall }),
  keys: { user: (id: string) => `user:${id}` },
}));

const { getUser } = await import("./users");

const storedUser = {
  id: "user-1",
  username: "alice",
  email: "alice@example.com",
  emailHash: "email-hash",
  passwordHash: "password-hash",
  createdAt: "2026-08-10T00:00:00.000Z",
  lastLoginAt: "",
};

beforeEach(() => {
  hgetall.mockReset();
});

describe("getUser", () => {
  it.each([true, "true"])(
    "maps a persisted emailVerified value of %j to true",
    async (emailVerified) => {
      hgetall.mockResolvedValue({ ...storedUser, emailVerified });
      await expect(getUser("user-1")).resolves.toMatchObject({ emailVerified: true });
    },
  );

  it.each([false, "false"])(
    "maps a persisted emailVerified value of %j to false",
    async (emailVerified) => {
      hgetall.mockResolvedValue({ ...storedUser, emailVerified });
      await expect(getUser("user-1")).resolves.toMatchObject({ emailVerified: false });
    },
  );
});
