/**
 * Browser-side client for the /api/gemini route.
 *
 * The browser never holds GEMINI_API_KEY and never talks to generativelanguage.googleapis.com.
 * It posts a Gemini request body to our own route; the route attaches the key server-side.
 * Nothing here is a NEXT_PUBLIC value, so nothing shows up in DevTools but a call to our
 * own origin.
 *
 * The route is a pass-through: it forwards the body verbatim to :generateContent and returns
 * Google's raw response. So this module owns building that body and reading the reply.
 *
 * Boundary unchanged: the model recognises and describes; calorie and macro numbers still
 * come from USDA (src/lib/dish.ts). Never read a nutrition figure out of `text`.
 */

// Same base as aiClient: unset means same-origin, set for the static GitHub Pages build
// pointing at the Vercel deployment that actually runs the route.
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

export interface GeminiImage {
  mimeType: string;
  /** base64, no `data:` prefix */
  dataBase64: string;
}

export interface GenerateRequest {
  prompt: string;
  system?: string;
  image?: GeminiImage;
  /** ask the model for strict JSON */
  json?: boolean;
  temperature?: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Build the `:generateContent` payload the route forwards untouched. */
export function buildGeminiBody(opts: GenerateRequest): Record<string, any> {
  const parts: any[] = [{ text: opts.prompt }];
  if (opts.image) {
    parts.push({
      inline_data: { mime_type: opts.image.mimeType, data: opts.image.dataBase64 },
    });
  }

  const body: Record<string, any> = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: opts.temperature ?? 0.2,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
  return body;
}

/**
 * Send a prompt through our route and return the model's text.
 *
 * The route answers 200 even when Google refused, so success is decided by the payload,
 * not the status: an `error` object from Google, or a missing key server-side (which makes
 * Google reject the request), both surface here as a thrown Error.
 */
export async function generateViaApi(opts: GenerateRequest): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/gemini`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildGeminiBody(opts)),
    });
  } catch {
    throw new Error("Couldn't reach the AI service. Check your connection and try again.");
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error(`AI service returned an unreadable response (${res.status}).`);
  }

  // Our route's own failure shape.
  if (typeof data?.error === "string") throw new Error(data.error);

  // Google's failure shape, passed through with a 200 by the route.
  if (data?.error) {
    const status = Number(data.error.code ?? res.status);
    if (status === 429) {
      throw new Error("Free-tier rate limit reached — try again in a minute.");
    }
    if (status === 400 || status === 403) {
      // A missing/invalid server key lands here; don't echo Google's message, it can
      // contain the request URL.
      throw new Error("The AI add-on isn't configured on the server right now.");
    }
    throw new Error("The AI service couldn't handle that request.");
  }

  const candidate = data?.candidates?.[0];
  if (candidate?.finishReason === "SAFETY") {
    throw new Error("The AI declined to answer that one. Try rephrasing.");
  }

  const text: string = (candidate?.content?.parts ?? [])
    .map((p: any) => p?.text ?? "")
    .join("")
    .trim();

  if (!text) throw new Error("The AI returned an empty response. Try again.");
  return text;
}

/** Pull the first JSON value out of a model reply, tolerating stray prose or fences. */
export function parseJsonReply<T>(text: string): T {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (start === -1 || end === -1) throw new Error("No JSON found in the model reply");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}
