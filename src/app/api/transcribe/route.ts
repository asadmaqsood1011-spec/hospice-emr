import { NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/auth";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "No audio" }, { status: 400 });
  }

  const file = new File([audio], "note.webm", { type: audio.type || "audio/webm" });

  const result = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "en",
    prompt:
      "Hospice clinical note. May include: patient symptoms, ESAS scores, PPS, medications, opioid doses, family/caregiver notes, code status.",
  });

  return NextResponse.json({ transcript: result.text });
}
