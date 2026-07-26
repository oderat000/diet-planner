import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json(); // Data sent from your frontend
    const key = process.env.GEMINI_API_KEY; // Hidden server environment variable
    
    const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";
    const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

    if (!key) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not set on the server" }, { status: 500 });
    }

    // Secure server-to-server call to Google
    const res = await fetch(`${ENDPOINT}/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch diet plan" }, { status: 500 });
  }
}