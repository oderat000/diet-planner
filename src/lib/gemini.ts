/**
 * Minimal Google Gemini client (REST, no SDK), called directly from the browser.
 *
 * Used only for the optional AI add-ons — dish recognition and the Q&A assistant.
 * The core diet planner never touches this; it stays fully offline. If no key is set,
 * `hasGeminiKey()` is false and the callers disable those features cleanly rather than error.
 *
 * Free key (email only, no card): https://aistudio.google.com/apikey
 * Put it in .env.local as NEXT_PUBLIC_GEMINI_API_KEY.
 *
 * This app is a static export with no server, so the key ships in the client bundle and is
 * visible to anyone who inspects the page — only set it if you accept that exposure.
 *
 * Important boundary: Gemini is asked to *recognize and describe* (what ingredients are in
 * a dish, or to answer questions from provided plan data). It is never the source of a
 * calorie number — those are always computed from USDA. See src/lib/dish.ts.
 */

// "-latest" is a self-updating alias, so a fixed version doesn't quietly go stale
// or get deprecated for new API keys the way "gemini-2.5-flash" already has.
const MODEL = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-flash-latest";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 30_000;

export function geminiKey(): string | null {
  return process.env.NEXT_PUBLIC_GEMINI_API_KEY || null;
}

export function hasGeminiKey(): boolean {
  return geminiKey() !== null;
}

/** Raised when a call is attempted with no key configured. */
export class NoKeyError extends Error {
  constructor() {
    super("No Gemini API key configured");
    this.name = "NoKeyError";
  }
}

export interface ImageInput {
  mimeType: string;
  /** base64, no data: prefix */
  dataBase64: string;
}

interface GenerateOptions {
  system?: string;
  prompt: string;
  image?: ImageInput;
  /** ask the model to return strict JSON */
  json?: boolean;
  temperature?: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function generate(opts: GenerateOptions): Promise<string> {
  const key = geminiKey();
  if (!key) throw new NoKeyError();

  const parts: any[] = [{ text: opts.prompt }];
  if (opts.image) {
    parts.push({
      inline_data: { mime_type: opts.image.mimeType, data: opts.image.dataBase64 },
    });
  }

  const body: any = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: opts.temperature ?? 0.2,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (opts.system) {
    body.systemInstruction = { parts: [{ text: opts.system }] };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${ENDPOINT}/${MODEL}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (res.status === 429) throw new Error("Gemini free-tier rate limit reached — try again in a minute.");
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Gemini returned ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
    }
    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text ?? "")
      .join("");
    if (!text) throw new Error("Gemini returned an empty response");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/** Pull the first JSON value out of a model reply, tolerating stray prose or fences. */
export function parseJson<T>(text: string): T {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (start === -1 || end === -1) throw new Error("No JSON found in model reply");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}
