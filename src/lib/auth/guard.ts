import { redirect } from "next/navigation";
import { getSession } from "./session";
import type { Session, User } from "./types";

/**
 * The authorization checkpoint. Call it at the top of every Server Component, Server
 * Action and route handler that touches user data.
 *
 * This — not Proxy — is what actually protects anything. Proxy sees only that a cookie
 * exists; it can't tell a revoked session from a live one, and it doesn't run at all for
 * a Server Action invoked from an already-rendered page. Next's own docs are explicit
 * that Proxy "should not be used as a full session management or authorization solution"
 * (node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md).
 *
 * Deny by default: it redirects rather than returning null, so forgetting to handle the
 * logged-out case can't accidentally expose data.
 */
export async function requireUser(): Promise<{ user: User; session: Session }> {
  const result = await getSession();
  if (!result) redirect("/login");
  if (!result.user.emailVerified) redirect("/verify-email");
  return result;
}

/** For pages that render differently when signed in but don't require it. */
export async function optionalUser(): Promise<{ user: User; session: Session } | null> {
  return getSession();
}

/**
 * Route-handler variant: returns a 401 instead of a redirect, since an API caller wants a
 * status code, not HTML.
 */
export async function requireUserForApi(): Promise<
  { ok: true; user: User; session: Session } | { ok: false; response: Response }
> {
  const result = await getSession();
  if (!result || !result.user.emailVerified) {
    return {
      ok: false,
      response: Response.json({ error: "Not signed in." }, { status: 401 }),
    };
  }
  return { ok: true, user: result.user, session: result.session };
}

/**
 * Admin check for the site-wide activity feed. Deliberately a plain env var of user ids
 * rather than a role column — there's no admin UI to manage roles, and a field in Redis
 * that grants site-wide read access to everyone's history is a bigger target than a
 * Vercel environment variable.
 */
export function isAdmin(user: User): boolean {
  const ids = (process.env.AUTH_ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim());
  return ids.filter(Boolean).includes(user.id);
}

export async function requireAdmin(): Promise<{ user: User; session: Session }> {
  const result = await requireUser();
  if (!isAdmin(result.user)) redirect("/");
  return result;
}
