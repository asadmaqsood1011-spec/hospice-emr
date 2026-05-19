import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getOpenAI } from "@/lib/openai";

const Body = z.object({
  transcript: z.string().min(1),
  patientId: z.string(),
});

const SYSTEM = `You are a hospice clinical scribe. Given a nurse's free-form voice transcript of a hospice visit, produce a structured SOAP note plus extracted hospice-specific data.

Output JSON ONLY with this shape:
{
  "subjective": "What patient/family reported (symptoms, concerns)",
  "objective": "Observable findings (vitals if mentioned, appearance, behavior)",
  "assessment": "Clinical interpretation, disease trajectory",
  "plan": "Med changes, interventions, follow-up timing, family support",
  "esas": {
    "pain": <0-10 or null>,
    "tiredness": <0-10 or null>,
    "drowsiness": <0-10 or null>,
    "nausea": <0-10 or null>,
    "appetite": <0-10 or null>,
    "shortBreath": <0-10 or null>,
    "depression": <0-10 or null>,
    "anxiety": <0-10 or null>,
    "wellbeing": <0-10 or null>
  },
  "pps": <0-100 in increments of 10 or null>,
  "medChanges": ["Increased morphine 10mg to 15mg q4h", ...],
  "icd10": [{ "code": "C78.7", "confidence": 0.92 }, ...],
  "confidence": <0.0-1.0, how confident you are in the structure>
}

Rules:
- Use null for ESAS items not mentioned. Do NOT invent scores.
- PPS is on 0,10,20,...100 scale (Palliative Performance Scale). Null if not stated.
- Medication changes: dose adjustments, new meds, discontinuations.
- ICD-10: only codes clearly supported by the transcript. Include per-code confidence.
- If transcript is ambiguous, lower confidence.
- Never fabricate vital signs, names, or numbers not in the transcript.`;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const { transcript } = parsed.data;

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Transcript:\n\n${transcript}` },
    ],
  });

  const raw = completion.choices[0].message.content;
  if (!raw) return NextResponse.json({ error: "No content" }, { status: 500 });

  try {
    const soap = JSON.parse(raw);
    return NextResponse.json(soap);
  } catch {
    return NextResponse.json({ error: "Invalid AI JSON", raw }, { status: 502 });
  }
}
