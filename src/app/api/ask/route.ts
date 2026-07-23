import { NextResponse } from "next/server";
import { NoKeyError, generate, hasGeminiKey } from "@/lib/gemini";

/**
 * Answer a customer's question about their diet, grounded in their actual plan.
 *
 * The plan facts (targets, today's meals, macros) are passed in and given to the model as
 * the source of truth. The assistant is told to answer from those facts, to be clear when
 * something isn't in them, and not to give medical advice — so it stays anchored to real
 * data rather than inventing specifics about this user.
 */
interface Body {
  question: string;
  context?: {
    goal?: string;
    dailyCalories?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
    todayDay?: string;
    todayMeals?: { name: string; calories: number; proteinG: number }[];
    language?: string;
  };
}

const SYSTEM =
  "You are a helpful diet assistant inside a meal-planning app. Answer the user's question " +
  "using the plan facts provided as the source of truth. If the answer isn't in those facts, " +
  "say so plainly rather than guessing specifics about this person. Give general, safe, " +
  "practical guidance; you are not a doctor, so for medical conditions advise seeing one. " +
  "Be concise — a few sentences. Reply in the user's language when one is given.";

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const question = (body.question ?? "").trim();

  if (!question) {
    return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
  }
  if (!hasGeminiKey()) {
    return NextResponse.json(
      {
        error:
          "The assistant needs a Gemini API key. Add GEMINI_API_KEY to .env.local to enable it.",
        needsKey: true,
      },
      { status: 400 },
    );
  }

  try {
    const answer = await generate({
      system: SYSTEM,
      prompt: buildPrompt(body),
      temperature: 0.4,
    });
    return NextResponse.json({ answer: answer.trim() });
  } catch (err) {
    if (err instanceof NoKeyError) {
      return NextResponse.json({ error: "No Gemini API key configured.", needsKey: true }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Could not answer right now";
    console.warn("ask failed:", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function buildPrompt(b: Body): string {
  const c = b.context ?? {};
  const facts: string[] = [];
  if (c.goal) facts.push(`Goal: ${c.goal}.`);
  if (c.dailyCalories) facts.push(`Daily calorie target: ${c.dailyCalories} kcal.`);
  if (c.proteinG || c.carbsG || c.fatG) {
    facts.push(`Daily macro targets: ${c.proteinG ?? "?"} g protein, ${c.carbsG ?? "?"} g carbs, ${c.fatG ?? "?"} g fat.`);
  }
  if (c.todayMeals?.length) {
    const meals = c.todayMeals
      .map((m) => `${m.name} (${m.calories} kcal, ${m.proteinG} g protein)`)
      .join("; ");
    facts.push(`Today (${c.todayDay ?? "today"}) meals: ${meals}.`);
  }

  return [
    facts.length ? `PLAN FACTS:\n${facts.join("\n")}` : "PLAN FACTS: none provided.",
    c.language && c.language !== "en" ? `Answer in language code: ${c.language}.` : "",
    `QUESTION: ${b.question}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
