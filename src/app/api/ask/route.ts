import { NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { AskContext, askAssistant } from "@/lib/askAssistant";
import { NeedsKeyError } from "@/lib/analyzeDish";

interface Body {
  question: string;
  context?: AskContext;
}

/**
 * Deployed on Vercel so GEMINI_API_KEY stays server-side. The static (GitHub Pages)
 * build of the app calls this over CORS instead of talking to Gemini directly.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  try {
    const answer = await askAssistant(body.question ?? "", body.context);
    return NextResponse.json({ answer }, { headers: corsHeaders() });
  } catch (err) {
    if (err instanceof NeedsKeyError) {
      return NextResponse.json(
        { error: err.message, needsKey: true },
        { status: 400, headers: corsHeaders() },
      );
    }
    const message = err instanceof Error ? err.message : "Could not answer right now";
    console.warn("ask failed:", err);
    return NextResponse.json({ error: message }, { status: 502, headers: corsHeaders() });
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
