/** Fields stored in the `user:<id>` hash. `passwordHash` never leaves the server. */
export type User = {
  id: string;
  username: string;
  emailHash: string;
  /** Kept for sending mail and showing the user their own address. */
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

/** What a Server Component is allowed to hand to the client. */
export type PublicUser = Pick<User, "id" | "username" | "email" | "emailVerified" | "createdAt">;

export type Session = {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  ipHash: string;
  userAgent: string;
};

/**
 * The closed set of things we record. An enum rather than free text so the log stays
 * queryable and so no call site can invent an event name we never intended to collect.
 */
export type ActivityEvent =
  | "auth.signup"
  | "auth.verify_email"
  | "auth.verify_failed"
  | "auth.login"
  | "auth.login_failed"
  | "auth.logout"
  | "auth.logout_all"
  | "auth.rate_limited"
  | "auth.password_reset_requested"
  | "auth.password_reset"
  | "auth.password_reset_failed"
  // No plan.* events: plan generation runs entirely in the browser, so the server never
  // sees it. Declaring events nothing can emit made the log look more complete than it is.
  | "dish.analyzed"
  | "assistant.asked"
  | "account.viewed_activity";

export type ActivityRecord = {
  id: string;
  userId: string | null;
  sessionId: string | null;
  event: ActivityEvent;
  targetType: string | null;
  targetId: string | null;
  /** Small, non-sensitive detail only — see the warning in audit.ts. */
  metadata: Record<string, string | number | boolean> | null;
  ipHash: string;
  userAgent: string;
  createdAt: string;
};
