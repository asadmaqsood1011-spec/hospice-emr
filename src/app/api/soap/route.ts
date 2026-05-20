import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getOpenAI } from "@/lib/openai";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const RATE_MAX = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_TRANSCRIPT_CHARS = 20_000;

const Body = z.object({
  transcript: z.string().min(1).max(MAX_TRANSCRIPT_CHARS),
  patientId: z.string(),
});

// Strict response shape — server validates before forwarding to client.
const SoapResponse = z.object({
  subjective: z.string().optional().nullable(),
  objective: z.string().optional().nullable(),
  assessment: z.string().optional().nullable(),
  plan: z.string().optional().nullable(),
  esas: z
    .object({
      pain: z.number().min(0).max(10).nullable().optional(),
      tiredness: z.number().min(0).max(10).nullable().optional(),
      drowsiness: z.number().min(0).max(10).nullable().optional(),
      nausea: z.number().min(0).max(10).nullable().optional(),
      appetite: z.number().min(0).max(10).nullable().optional(),
      shortBreath: z.number().min(0).max(10).nullable().optional(),
      depression: z.number().min(0).max(10).nullable().optional(),
      anxiety: z.number().min(0).max(10).nullable().optional(),
      wellbeing: z.number().min(0).max(10).nullable().optional(),
    })
    .nullable()
    .optional(),
  pps: z.number().min(0).max(100).nullable().optional(),
  medChanges: z.array(z.string()).optional(),
  icd10: z
    .array(
      z.union([
        z.string(),
        z.object({ code: z.string(), confidence: z.number().min(0).max(1).optional() }),
      ])
    )
    .optional(),
  confidence: z.number().min(0).max(1).optional(),
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

  const rl = rateLimit(`soap:${session.user.id}`, RATE_MAX, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: rateLimitHeaders(rl, RATE_MAX) }
    );
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const { transcript } = parsed.data;

  try {
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
    if (!raw) return NextResponse.json({ error: "No content" }, { status: 502 });

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid AI JSON" }, { status: 502 });
    }

    const validated = SoapResponse.safeParse(parsedJson);
    if (!validated.success) {
      logger.warn({ route: "soap", issues: validated.error.flatten() }, "AI returned off-schema SOAP");
      return NextResponse.json(
        { error: "AI response did not match expected schema" },
        { status: 502 }
      );
    }

    return NextResponse.json(validated.data, { headers: rateLimitHeaders(rl, RATE_MAX) });
  } catch (err) {
    logger.error({ route: "soap", err: (err as Error).message }, "OpenAI SOAP call failed");
    return NextResponse.json({ error: "Upstream AI service failed" }, { status: 502 });
  }
}
