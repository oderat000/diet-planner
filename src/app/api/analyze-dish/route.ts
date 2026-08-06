import {
  BadRequestError,
  asObject,
  corsPreflight,
  optionalString,
  withApiGuards,
} from "@/lib/apiGuard";
import { AnalyzeDishInput, analyzeDish } from "@/lib/analyzeDish";
import { auditLog } from "@/lib/auth/audit";
import { optionalUser } from "@/lib/auth/guard";

/** Roughly a 4 MB photo once base64 inflates it by a third. */
const MAX_IMAGE_BASE64 = 5_500_000;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

function parse(raw: unknown): AnalyzeDishInput {
  const body = asObject(raw);
  const text = optionalString(body.text, "text", 2000);

  let image: AnalyzeDishInput["image"];
  if (body.image !== undefined && body.image !== null) {
    const img = asObject(body.image);
    const mimeType = optionalString(img.mimeType, "image.mimeType", 100) ?? "";
    const dataBase64 = optionalString(img.dataBase64, "image.dataBase64", MAX_IMAGE_BASE64);

    if (!ALLOWED_MIME.includes(mimeType)) {
      throw new BadRequestError(`"image.mimeType" must be one of ${ALLOWED_MIME.join(", ")}.`);
    }
    if (!dataBase64) throw new BadRequestError('"image.dataBase64" is required with an image.');
    image = { mimeType, dataBase64 };
  }

  if (!text?.trim() && !image) {
    throw new BadRequestError("Provide a dish description or a photo.");
  }
  return { text, image };
}

/**
 * Deployed on Vercel so GEMINI_API_KEY stays server-side. The static (GitHub Pages)
 * build of the app calls this over CORS instead of talking to Gemini directly.
 */
export async function POST(req: Request) {
  return withApiGuards(req, parse, async (body) => {
    // Optional, not required: the static GitHub Pages build calls this route cross-origin
    // with no cookies, so demanding a session here would break that deployment. Signed-in
    // requests get logged; anonymous ones still work.
    const current = await optionalUser();

    const result = await analyzeDish(body);
    await auditLog("dish.analyzed", {
      userId: current?.user.id,
      sessionId: current?.session.id,
      // The photo and its contents are deliberately not recorded — see audit.ts.
      metadata: { ingredients: result.ingredients.length, aiRecognized: result.aiRecognized },
    });
    return result;
  });
}

export function OPTIONS() {
  return corsPreflight();
}
