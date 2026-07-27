"use server";

import { redirect } from "next/navigation";
import { auditLog } from "./audit";
import { burnPasswordTime, verifyPassword } from "./crypto";
import { sendVerificationEmail } from "./email";
import { limitEmailSend, limitLogin, limitSignup } from "./limits";
import { getSession, createSession, destroyAllSessions, destroyCurrentSession } from "./session";
import {
  createUser,
  findUserByEmail,
  isBreachedPassword,
  markEmailVerified,
  recordLogin,
  usernameTaken,
  validateEmail,
  validatePassword,
  validateUsername,
} from "./users";
import { consumeVerificationToken, createVerificationToken } from "./verification";

export type FormState = { error?: string; notice?: string };

function minutes(seconds: number): string {
  return seconds < 60 ? `${seconds} seconds` : `${Math.ceil(seconds / 60)} minutes`;
}

/**
 * Signup: email + username + password. The account exists immediately but is unusable
 * until the emailed link is clicked — `requireUser()` bounces unverified users — which is
 * what makes "accounts are created by identifying an email address" true rather than
 * merely requested.
 */
export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "");
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  const invalid = validateEmail(email) ?? validateUsername(username) ?? validatePassword(password);
  if (invalid) return { error: invalid };

  const limit = await limitSignup();
  if (!limit.ok) {
    await auditLog("auth.rate_limited", { metadata: { endpoint: "signup" } });
    return { error: `Too many accounts from this network. Try again in ${minutes(limit.retryAfterSeconds)}.` };
  }

  if (await isBreachedPassword(password)) {
    return { error: "That password appears in a known data breach. Please choose a different one." };
  }

  // Checked up front for a clear error message; createUser still claims the name
  // atomically, because this check and the write can't be made a single operation.
  if (await usernameTaken(username)) return { error: "That username is taken." };

  const created = await createUser({ email, username, password });

  if (!created.ok) {
    if (created.error === "username-taken") return { error: "That username is taken." };
    // Email already registered. Don't say so — that turns signup into an oracle for
    // "does this person have an account". Show the same success screen either way.
    await auditLog("auth.signup", { metadata: { outcome: "duplicate-email" } });
    return { notice: "sent" };
  }

  await auditLog("auth.signup", {
    userId: created.user.id,
    metadata: { username: created.user.username },
  });

  const token = await createVerificationToken(created.user.id);
  await sendVerificationEmail(created.user.email, token);

  return { notice: "sent" };
}

/** Redeems the link from the email, then signs the user in. */
export async function verifyEmailAction(token: string): Promise<{ error?: string }> {
  const userId = await consumeVerificationToken(token);
  if (!userId) {
    await auditLog("auth.verify_failed");
    return { error: "That confirmation link is invalid or has expired. Request a new one below." };
  }

  await markEmailVerified(userId);
  await auditLog("auth.verify_email", { userId });

  const sessionId = await createSession(userId);
  await recordLogin(userId);
  await auditLog("auth.login", { userId, sessionId, metadata: { via: "verification-link" } });
  return {};
}

export async function resendVerificationAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") ?? "");
  if (validateEmail(email)) return { error: "Enter a valid email address." };

  const limit = await limitEmailSend(email);
  if (!limit.ok) {
    return { error: `Too many emails requested. Try again in ${minutes(limit.retryAfterSeconds)}.` };
  }

  const user = await findUserByEmail(email);
  // Same response whether or not the account exists or is already verified.
  if (user && !user.emailVerified) {
    await sendVerificationEmail(user.email, await createVerificationToken(user.id));
  }
  return { notice: "sent" };
}

/**
 * Login. Every failure path returns the identical message and takes roughly the same
 * time, so the form can't be used to enumerate which emails are registered.
 */
export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const generic = "Email or password is incorrect.";

  if (validateEmail(email) || password.length === 0) return { error: generic };

  const limit = await limitLogin(email);
  if (!limit.ok) {
    await auditLog("auth.rate_limited", { metadata: { endpoint: "login" } });
    return { error: `Too many sign-in attempts. Try again in ${minutes(limit.retryAfterSeconds)}.` };
  }

  const user = await findUserByEmail(email);
  if (!user) {
    // Hash anyway so a missing account doesn't answer measurably faster than a wrong password.
    await burnPasswordTime(password);
    await auditLog("auth.login_failed", { metadata: { reason: "no-account" } });
    return { error: generic };
  }

  if (!(await verifyPassword(user.passwordHash, password))) {
    await auditLog("auth.login_failed", { userId: user.id, metadata: { reason: "bad-password" } });
    return { error: generic };
  }

  if (!user.emailVerified) {
    await auditLog("auth.login_failed", { userId: user.id, metadata: { reason: "unverified" } });
    return { error: "Confirm your email address first — check your inbox for the link." };
  }

  const sessionId = await createSession(user.id);
  await recordLogin(user.id);
  await auditLog("auth.login", { userId: user.id, sessionId });

  redirect("/");
}

export async function logoutAction(): Promise<void> {
  const current = await getSession();
  if (current) {
    await auditLog("auth.logout", { userId: current.user.id, sessionId: current.session.id });
  }
  await destroyCurrentSession();
  redirect("/login");
}

/** Revokes every session for the account — the "signed in somewhere I don't recognise" button. */
export async function logoutEverywhereAction(): Promise<void> {
  const current = await getSession();
  if (!current) redirect("/login");

  const count = await destroyAllSessions(current.user.id);
  await auditLog("auth.logout_all", {
    userId: current.user.id,
    sessionId: current.session.id,
    metadata: { sessionsRevoked: count },
  });
  await destroyCurrentSession();
  redirect("/login");
}
