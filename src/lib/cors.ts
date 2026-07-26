/**
 * The GitHub Pages build is a different origin than this API (deployed on Vercel), so the
 * AI routes need CORS headers. Restrict to the known static-site origin rather than "*" —
 * these routes spend a metered Gemini key on every request.
 */
const ALLOWED_ORIGIN = process.env.STATIC_SITE_ORIGIN || "https://oderat000.github.io";

export function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
