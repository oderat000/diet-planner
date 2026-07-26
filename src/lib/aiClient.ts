import type { AnalyzeDishInput, AnalyzeDishResult } from "@/lib/analyzeDish";
import type { AskContext } from "@/lib/askAssistant";

/**
 * Browser-side calls to the AI add-on routes. In production these routes are deployed on
 * Vercel (so the Gemini key stays server-side) and this app is served statically from
 * GitHub Pages, hence the absolute base URL rather than a same-origin relative path.
 * Leave NEXT_PUBLIC_API_BASE_URL unset to call same-origin (e.g. local dev, or a
 * non-static deployment that serves both the pages and the API).
 */
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `Server error (${res.status})`);
  return data as T;
}

export function analyzeDish(input: AnalyzeDishInput): Promise<AnalyzeDishResult> {
  return postJson<AnalyzeDishResult>("/api/analyze-dish", input);
}

export async function askAssistant(question: string, context?: AskContext): Promise<string> {
  const { answer } = await postJson<{ answer: string }>("/api/ask", { question, context });
  return answer;
}
