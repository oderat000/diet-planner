import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const key = process.env.GEMINI_API_KEY;
    const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";
    const MODEL = "gemini-1.5-flash";

    const res = await fetch(`${ENDPOINT}/models/${MODEL}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to connect to Gemini" }, { status: 500 });
  }
}