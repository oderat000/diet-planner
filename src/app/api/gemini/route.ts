import { NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rateLimit";
import { ImageInput, NoKeyError, generate } from "@/lib/gemini";

interface Body {
  prompt?: string;
  system?: string;
  image?: ImageInput;
  json?: boolean;
  temperature?: number;
}

/**
 * Generic text generation, deployed on Vercel so GEMINI_API_KEY stays server-side —
 * the browser never sees it and never talks to Gemini directly.
 *
 * Deliberately NOT a pass-through proxy: only the fields below are forwarded, so a
 * caller can't reshape the request (model, tools, safety settings) or use the key as
 * a free relay. Nutrition numbers still come from USDA, never from the model reply.
 */
export async function POST(req: Request) {
  const limit = await checkRateLimit(req);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests — try again shortly." },
      { status: 429, headers: { ...corsHeaders(), "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: corsHeaders() });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "A 'prompt' string is required" }, { status: 400, headers: corsHeaders() });
  }

  try {
    const text = await generate({
      prompt,
      system: typeof body.system === "string" ? body.system : undefined,
      image: body.image,
      json: body.json === true,
      temperature: typeof body.temperature === "number" ? body.temperature : undefined,
    });
    return NextResponse.json({ text }, { headers: corsHeaders() });
  } catch (err) {
    if (err instanceof NoKeyError) {
      return NextResponse.json(
        { error: err.message, needsKey: true },
        { status: 400, headers: corsHeaders() },
      );
    }
    const message = err instanceof Error ? err.message : "Could not reach Gemini";
    console.warn("gemini failed:", err);
    return NextResponse.json({ error: message }, { status: 502, headers: corsHeaders() });
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
