import { headers } from "next/headers";

/**
 * Sends the verification email through Resend's REST API directly — no SDK, so nothing
 * extra to keep patched.
 *
 * With RESEND_API_KEY unset (local development), the link is printed to the server
 * console instead. That keeps signup testable without an email provider, and it is the
 * only place a raw token is ever written down.
 */
async function send(to: string, subject: string, html: string, text: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;

  if (!apiKey || !from) {
    console.info(`[auth] email to ${to} — ${subject}\n${text}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!res.ok) {
    // Logged, not thrown: the account exists and the user can request a new link.
    console.error(`[auth] Resend rejected the message: ${res.status} ${await res.text()}`);
  }
}

/**
 * Builds the absolute link. Uses the request's own Host header rather than a hardcoded
 * domain so preview deployments verify against themselves — but only after checking it
 * against the allowed hosts, because Host is attacker-controlled and an unchecked one
 * turns every verification email into a token-stealing link.
 */
async function baseUrl(): Promise<string> {
  const configured = process.env.AUTH_URL;
  if (configured) return configured.replace(/\/$/, "");

  const host = (await headers()).get("host") ?? "localhost:3000";
  const allowed = host === "localhost:3000" || host.endsWith(".vercel.app");
  if (!allowed) throw new Error(`Refusing to build a verification link for host ${host}. Set AUTH_URL.`);

  return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const link = `${await baseUrl()}/verify-email/${encodeURIComponent(token)}`;
  await send(
    email,
    "Confirm your Diet Planner account",
    `<p>Confirm your email address to finish creating your Diet Planner account.</p>
     <p><a href="${link}">Confirm my email</a></p>
     <p>This link works once and expires in 30 minutes. If you didn't sign up, ignore this message — no account will be created.</p>`,
    `Confirm your email to finish creating your Diet Planner account:\n${link}\n\nThis link works once and expires in 30 minutes.`,
  );
}
