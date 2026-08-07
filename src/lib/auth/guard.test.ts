import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session, User } from "./types";

// `redirect()` in a real Next.js request throws a special NEXT_REDIRECT error to unwind
// the render; a plain mock that also throws lets us assert both that it was called *and*
// that nothing after it runs, without a router in the loop.
const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect }));

const getSession = vi.fn();
vi.mock("./session", () => ({ getSession }));

const { requireUser, requireUserForApi, isAdmin, requireAdmin } = await import("./guard");

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

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "session-1",
    userId: "user-1",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    ipHash: "iphash",
    userAgent: "vitest",
    ...overrides,
  };
}

beforeEach(() => {
  redirect.mockClear();
  getSession.mockReset();
  delete process.env.AUTH_ADMIN_USER_IDS;
});

describe("requireUser", () => {
  it("returns the session when signed in and verified", async () => {
    const user = makeUser();
    const session = makeSession();
    getSession.mockResolvedValue({ user, session });

    await expect(requireUser()).resolves.toEqual({ user, session });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects to /login when there is no session", async () => {
    getSession.mockResolvedValue(null);
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects to /verify-email rather than granting access to an unverified user", async () => {
    const user = makeUser({ emailVerified: false });
    getSession.mockResolvedValue({ user, session: makeSession() });

    await expect(requireUser()).rejects.toThrow("REDIRECT:/verify-email");
  });
});

describe("requireUserForApi", () => {
  it("returns ok:true with the user when signed in and verified", async () => {
    const user = makeUser();
    const session = makeSession();
    getSession.mockResolvedValue({ user, session });

    const result = await requireUserForApi();
    expect(result).toEqual({ ok: true, user, session });
  });

  it("returns a 401 Response instead of redirecting when signed out", async () => {
    getSession.mockResolvedValue(null);

    const result = await requireUserForApi();
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.response.status).toBe(401);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns a 401 for an unverified user rather than letting the request through", async () => {
    getSession.mockResolvedValue({ user: makeUser({ emailVerified: false }), session: makeSession() });

    const result = await requireUserForApi();
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.response.status).toBe(401);
  });
});

describe("isAdmin", () => {
  it("is false when the env var is unset", () => {
    expect(isAdmin(makeUser({ id: "user-1" }))).toBe(false);
  });

  it("matches an id in the comma-separated list", () => {
    process.env.AUTH_ADMIN_USER_IDS = "user-9, user-1 ,user-42";
    expect(isAdmin(makeUser({ id: "user-1" }))).toBe(true);
    expect(isAdmin(makeUser({ id: "user-2" }))).toBe(false);
  });

  it("does not treat an empty entry as matching a user with no id", () => {
    process.env.AUTH_ADMIN_USER_IDS = "user-9,,user-42";
    // An empty id can't come from newId(), but the filter(Boolean) that stops it matching
    // the stray empty entry is the thing worth pinning down.
    expect(isAdmin(makeUser({ id: "" }))).toBe(false);
  });
});

describe("requireAdmin", () => {
  it("returns the session for an admin", async () => {
    process.env.AUTH_ADMIN_USER_IDS = "user-1";
    const user = makeUser({ id: "user-1" });
    const session = makeSession();
    getSession.mockResolvedValue({ user, session });

    await expect(requireAdmin()).resolves.toEqual({ user, session });
  });

  it("redirects a signed-in non-admin to / rather than showing the page", async () => {
    process.env.AUTH_ADMIN_USER_IDS = "someone-else";
    getSession.mockResolvedValue({ user: makeUser({ id: "user-1" }), session: makeSession() });

    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/");
  });

  it("redirects a signed-out visitor to /login, not /", async () => {
    process.env.AUTH_ADMIN_USER_IDS = "user-1";
    getSession.mockResolvedValue(null);

    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/login");
  });
});
