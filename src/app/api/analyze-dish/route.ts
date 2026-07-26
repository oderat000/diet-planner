import { NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { AnalyzeDishInput, NeedsKeyError, analyzeDish } from "@/lib/analyzeDish";

/**
 * Deployed on Vercel so GEMINI_API_KEY stays server-side. The static (GitHub Pages)
 * build of the app calls this over CORS instead of talking to Gemini directly.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as AnalyzeDishInput;
  try {
    const result = await analyzeDish(body);
    return NextResponse.json(result, { headers: corsHeaders() });
  } catch (err) {
    if (err instanceof NeedsKeyError) {
      return NextResponse.json(
        { error: err.message, needsKey: true },
        { status: 400, headers: corsHeaders() },
      );
    }
    const message = err instanceof Error ? err.message : "Could not analyze the dish";
    console.warn("analyze-dish failed:", err);
    return NextResponse.json({ error: message }, { status: 502, headers: corsHeaders() });
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
