import { NextResponse } from "next/server";
import { corsHeaders } from "./cors";
import { checkRateLimit } from "./rateLimit";
import { NeedsKeyError } from "./analyzeDish";

/**
 * The shared preamble for the Gemini-backed routes: rate limit, CORS, body parsing and
 * error mapping. Both routes had this inline and identical, and both parsed the body
 * *outside* their try block — so malformed JSON produced an unhandled 500 with no CORS
 * headers, which the browser then reported as a network error rather than a bad request.
 *
 * Validation is hand-written rather than schema-library-driven, matching lib/auth/users.ts
 * and keeping the dependency list at zero.
 */

/** Thrown by a body parser when the request is malformed. Becomes a 400. */
export class BadRequestError extends Error {}

/**
 * Requests larger than this are refused before the body is read. The dish analyzer
 * accepts a base64 photo, so the cap is generous — but unbounded meant a caller could
 * push an arbitrarily large payload straight through to a metered API.
 */
const MAX_BODY_BYTES = 8 * 1024 * 1024; // 8 MB

function json(body: unknown, status: number, extra?: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: { ...corsHeaders(), ...extra },
  });
}

export async function withApiGuards<T>(
  req: Request,
  parseBody: (raw: unknown) => T,
  run: (body: T) => Promise<unknown>,
): Promise<Response> {
  const limit = await checkRateLimit(req);
  if (!limit.ok) {
    return json({ error: "Too many requests — try again shortly." }, 429, {
      "Retry-After": String(limit.retryAfterSeconds),
    });
  }

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) {
    return json({ error: "Request too large." }, 413);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  let body: T;
  try {
    body = parseBody(raw);
  } catch (err) {
    const message = err instanceof BadRequestError ? err.message : "Invalid request body.";
    return json({ error: message }, 400);
  }

  try {
    return json(await run(body), 200);
  } catch (err) {
    if (err instanceof NeedsKeyError) {
      return json({ error: err.message, needsKey: true }, 400);
    }
    // Upstream text can carry provider detail, so log it and return something generic.
    console.warn("api route failed:", err);
    return json({ error: "The service is unavailable right now. Try again shortly." }, 502);
  }
}

export function corsPreflight(): Response {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/* --- small validation helpers ------------------------------------------------ */

export function asObject(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new BadRequestError("Expected a JSON object.");
  }
  return raw as Record<string, unknown>;
}

export function optionalString(
  value: unknown,
  field: string,
  maxLength: number,
): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new BadRequestError(`"${field}" must be a string.`);
  if (value.length > maxLength) {
    throw new BadRequestError(`"${field}" must be at most ${maxLength} characters.`);
  }
  return value;
}

export function requiredString(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  const s = optionalString(value, field, maxLength);
  if (s === undefined || s.trim() === "") {
    throw new BadRequestError(`"${field}" is required.`);
  }
  return s;
}
