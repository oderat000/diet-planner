import {
  asObject,
  corsPreflight,
  optionalString,
  requiredString,
  withApiGuards,
} from "@/lib/apiGuard";
import { AskContext, askAssistant } from "@/lib/askAssistant";
import { auditLog } from "@/lib/auth/audit";
import { optionalUser } from "@/lib/auth/guard";

interface Body {
  question: string;
  context?: AskContext;
}

/**
 * The context is plan facts the client already has; it is prompt material, not a source
 * of truth, so it is bounded rather than deeply validated. Anything unexpected is dropped
 * instead of being forwarded to the model.
 */
function parseContext(raw: unknown): AskContext | undefined {
  if (raw === undefined || raw === null) return undefined;
  const c = asObject(raw);

  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
  const meals = Array.isArray(c.todayMeals)
    ? c.todayMeals.slice(0, 12).flatMap((m) => {
        if (typeof m !== "object" || m === null) return [];
        const meal = m as Record<string, unknown>;
        return [
          {
            name: String(meal.name ?? "").slice(0, 200),
            calories: num(meal.calories) ?? 0,
            proteinG: num(meal.proteinG) ?? 0,
          },
        ];
      })
    : undefined;

  return {
    goal: optionalString(c.goal, "context.goal", 100),
    dailyCalories: num(c.dailyCalories),
    proteinG: num(c.proteinG),
    carbsG: num(c.carbsG),
    fatG: num(c.fatG),
    todayDay: optionalString(c.todayDay, "context.todayDay", 100),
    todayMeals: meals,
    language: optionalString(c.language, "context.language", 20),
  };
}

function parse(raw: unknown): Body {
  const body = asObject(raw);
  return {
    question: requiredString(body.question, "question", 2000),
    context: parseContext(body.context),
  };
}

/**
 * Deployed on Vercel so GEMINI_API_KEY stays server-side. The static (GitHub Pages)
 * build of the app calls this over CORS instead of talking to Gemini directly.
 */
export async function POST(req: Request) {
  return withApiGuards(req, parse, async (body) => {
    const current = await optionalUser();
    const answer = await askAssistant(body.question, body.context);
    await auditLog("assistant.asked", {
      userId: current?.user.id,
      sessionId: current?.session.id,
      // The question itself is not recorded — it's free text about the user's health.
      metadata: { questionLength: body.question.length },
    });
    return { answer };
  });
}

export function OPTIONS() {
  return corsPreflight();
}
