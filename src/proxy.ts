import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy — what Next.js called Middleware before v16. Same feature, new file convention;
 * it lives next to `app/` and there can only be one per project.
 *
 * This is an OPTIMISTIC check only. It sees whether a session cookie is present, which is
 * enough to bounce a signed-out visitor off /create before the page renders, and nothing
 * more: it does not talk to Redis, so it can't tell a live session from a revoked or
 * forged one, and it never runs for a Server Action fired from an already-open page.
 *
 * The real authorization is `requireUser()` in src/lib/auth/guard.ts, called inside every
 * protected page, action and route handler. Deleting this file would cost some redirect
 * polish; deleting those calls would expose data.
 */
const PROTECTED = ["/create", "/preview", "/account"];
const AUTH_PAGES = ["/login", "/signup", "/forgot-password", "/reset-password"];

// Note: `runtime` cannot be configured here — Proxy always runs on the Node.js runtime in v16.
export const config = {
  // Skip static assets and Next internals so this doesn't run on every image request.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession =
    request.cookies.has("__Host-dp_session") || request.cookies.has("dp_session");

  if (!hasSession && PROTECTED.some((p) => pathname.startsWith(p))) {
    const login = new URL("/login", request.url);
    // Bring them back where they were headed once they've signed in. Only ever a path
    // from our own URL — never a caller-supplied absolute URL, which would make this an
    // open redirect straight into a phishing page.
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (hasSession && AUTH_PAGES.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}
