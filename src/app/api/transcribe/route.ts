import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOpenAI } from "@/lib/openai";

// Languages we offer in the recorder UI. Whisper supports ~50+; this is the curated list.
const SUPPORTED: Record<string, string> = {
  en: "English",
  pa: "Punjabi",
  tl: "Tagalog",
  fr: "French",
  es: "Spanish",
  zh: "Chinese",
  hi: "Hindi",
  ar: "Arabic",
  ur: "Urdu",
};

const RATE_MAX = 30; // per user per hour
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB Whisper limit

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(`transcribe:${session.user.id}`, RATE_MAX, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: rateLimitHeaders(rl, RATE_MAX) }
    );
  }

  const form = await req.formData();
  const audio = form.get("audio");
  const language = String(form.get("language") ?? "en");

  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "No audio" }, { status: 400 });
  }
  if (audio.size === 0) {
    return NextResponse.json({ error: "Empty audio" }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Audio over 25 MB limit" }, { status: 413 });
  }
  if (!SUPPORTED[language]) {
    return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
  }

  const file = new File([audio], "note.webm", { type: audio.type || "audio/webm" });

  // 1. Transcribe in source language
  const openai = getOpenAI();

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language,
    prompt:
      "Hospice clinical note. May include: patient symptoms, ESAS scores, PPS, medications, opioid doses, family/caregiver notes, code status.",
  });

  const original = transcription.text;
  let english = original;

  // 2. If not English, translate via GPT-4o
  if (language !== "en") {
    const translation = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "Translate the following hospice clinical note from " +
            SUPPORTED[language] +
            " into clinical English. Preserve numbers, drug names, and dosages exactly. Keep medical terminology in English (do not over-translate). Output only the translation.",
        },
        { role: "user", content: original },
      ],
    });
    english = translation.choices[0].message.content ?? original;
  }

  return NextResponse.json({
    transcript: english,
    transcriptOriginal: original,
    language,
  });
}
