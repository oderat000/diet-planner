import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const key = process.env.GEMINI_API_KEY;
    const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";
    const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

    if (!key) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not set on the server" }, { status: 500 });
    }

    const res = await fetch(`${ENDPOINT}/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to connect to Gemini" }, { status: 500 });
  }
}