import { NoKeyError, generate, hasGeminiKey, parseJson } from "@/lib/gemini";
import { DishIngredientInput, DishNutrition, costDish, parseIngredientLines } from "@/lib/dish";

/**
 * Estimate the nutrition of a dish the user prepared, from a photo and/or a text
 * description. Gemini recognises the ingredients and their rough weights; USDA turns
 * those into real calories and protein. The AI never states a calorie figure.
 */
export interface AnalyzeDishInput {
  text?: string;
  image?: { mimeType: string; dataBase64: string };
}

export interface AnalyzeDishResult extends DishNutrition {
  dish: string;
  amountsEstimated: true;
  aiRecognized: boolean;
}

export class NeedsKeyError extends Error {}

const SYSTEM =
  "You are a food recognition assistant. Identify the ingredients of a prepared dish and " +
  "estimate the cooked weight in grams of each, for one typical serving. You do NOT report " +
  "calories or nutrition — only ingredients and grams. Use simple, singular ingredient names " +
  "a nutrition database would list (e.g. 'chicken breast', 'white rice', 'olive oil'). " +
  'Respond as strict JSON: {"dish":"short name","ingredients":[{"name":"...","grams":120}]}.';

interface AiResult {
  dish?: string;
  ingredients?: { name?: string; grams?: number }[];
}

export async function analyzeDish(body: AnalyzeDishInput): Promise<AnalyzeDishResult> {
  const text = (body.text ?? "").trim();

  // Keyless path: if the user typed explicit quantities, weigh them directly — no AI needed.
  if (!body.image && text) {
    const parsed = parseIngredientLines(text);
    if (parsed) return respond(parsed, text);
  }

  if (!hasGeminiKey()) {
    throw new NeedsKeyError(
      "Reading a photo (or a free-text dish) needs a Gemini API key. Add NEXT_PUBLIC_GEMINI_API_KEY to .env.local, or type the ingredients with amounts like “200g chicken, 100g rice” to compute it with no key.",
    );
  }

  if (!body.image && !text) {
    throw new Error("Send a photo or describe the dish.");
  }

  const prompt = text
    ? `Identify the ingredients and per-serving grams of this dish: ${text}`
    : "Identify the ingredients and per-serving grams of the dish in this image.";

  try {
    const raw = await generate({
      system: SYSTEM,
      prompt,
      image: body.image,
      json: true,
    });

    const ai = parseJson<AiResult>(raw);
    const inputs: DishIngredientInput[] = (ai.ingredients ?? [])
      .map((i) => ({ name: String(i?.name ?? "").trim(), grams: Math.max(0, Number(i?.grams) || 0) }))
      .filter((i) => i.name.length > 0);

    if (inputs.length === 0) {
      throw new Error("Couldn't recognise any ingredients. Try a clearer photo or type the dish.");
    }

    return respond(inputs, ai.dish ?? text, true);
  } catch (err) {
    if (err instanceof NoKeyError) throw new NeedsKeyError("No Gemini API key configured.");
    throw err;
  }
}

async function respond(
  inputs: DishIngredientInput[],
  dish: string,
  aiRecognized = false,
): Promise<AnalyzeDishResult> {
  const nutrition = await costDish(inputs);
  return {
    dish: (dish || "Your dish").slice(0, 80),
    ...nutrition,
    // amounts are estimated (by AI or by the user); the per-ingredient nutrition is USDA-real
    amountsEstimated: true,
    aiRecognized,
  };
}
