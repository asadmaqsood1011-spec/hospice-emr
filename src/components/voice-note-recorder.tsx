"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AudioWaveform,
  Bot,
  Check,
  FileText,
  Mic,
  Save,
  ShieldCheck,
  Square,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";
import { queueNote } from "@/lib/outbox";
import { cn } from "@/lib/utils";

type SoapDraft = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  esas?: Record<string, number | null>;
  pps?: number | null;
  medChanges?: string[];
  icd10?: Array<string | { code: string; confidence?: number }>;
  confidence?: number;
};

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "pa", label: "Punjabi" },
  { code: "tl", label: "Tagalog" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "zh", label: "Chinese" },
  { code: "hi", label: "Hindi" },
  { code: "ar", label: "Arabic" },
  { code: "ur", label: "Urdu" },
];

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"];

export function VoiceNoteRecorder({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState<"idle" | "transcribing" | "structuring" | "saving">("idle");
  const [transcript, setTranscript] = useState("");
  const [transcriptOriginal, setTranscriptOriginal] = useState("");
  const [language, setLanguage] = useState("en");
  const [visitType, setVisitType] = useState("RN_VISIT");
  const [draft, setDraft] = useState<SoapDraft | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);

  const supportedMime = useMemo(() => {
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return "";
    return MIME_CANDIDATES.find((mime) => MediaRecorder.isTypeSupported(mime)) ?? "";
  }, []);

  const canRecord =
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined" &&
    Boolean(supportedMime);

  useEffect(() => {
    if (!recording && busy === "idle" && !draft) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [recording, busy, draft]);

  function cleanupStream() {
    streamRef.current?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    streamRef.current = null;
  }

  async function start() {
    if (!canRecord) {
      toast.error("Recording is not supported in this browser");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: supportedMime });
      chunksRef.current = [];
      mr.ondataavailable = (event) => event.data.size > 0 && chunksRef.current.push(event.data);
      mr.onerror = () => {
        cleanupStream();
        mediaRecorderRef.current = null;
        setRecording(false);
        setBusy("idle");
        toast.error("Recorder stopped unexpectedly");
      };
      mr.onstop = () => {
        cleanupStream();
        mediaRecorderRef.current = null;
        const blob = new Blob(chunksRef.current, { type: supportedMime });
        processAudio(blob);
      };
      stream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          if (mediaRecorderRef.current?.state === "recording") stop();
        };
      });
      startedAtRef.current = Date.now();
      mr.start(1000);
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch (error) {
      cleanupStream();
      toast.error("Microphone access denied");
      console.error(error);
    }
  }

  function stop() {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "recording") {
      recorder.stop();
    } else {
      cleanupStream();
    }
    setRecording(false);
  }

  async function processAudio(blob: Blob) {
    const durationMs = Date.now() - startedAtRef.current;
    if (durationMs < 1500 || blob.size < 1024) {
      toast.error("Recording too short");
      setBusy("idle");
      return;
    }

    setBusy("transcribing");
    try {
      const fd = new FormData();
      fd.append("audio", blob, supportedMime.includes("mp4") ? "note.mp4" : "note.webm");
      fd.append("language", language);
      const tRes = await fetch("/api/transcribe", { method: "POST", body: fd });
      if (!tRes.ok) throw new Error(await readApiError(tRes, "Transcription failed"));
      const { transcript: txt, transcriptOriginal: orig } = await tRes.json();
      setTranscript(txt);
      setTranscriptOriginal(orig ?? "");

      setBusy("structuring");
      const sRes = await fetch("/api/soap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: txt, patientId }),
      });
      if (!sRes.ok) throw new Error(await readApiError(sRes, "SOAP structuring failed"));
      const soap = await sRes.json();
      setDraft(soap);
      toast.success("SOAP draft ready - review and sign");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy("idle");
    }
  }

  async function save(sign: boolean) {
    if (!draft) return;
    setBusy("saving");

    const payload = {
      patientId,
      transcript,
      transcriptOriginal,
      language,
      visitType,
      ...getVisitTiming(patientId),
      ...draft,
      sign,
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await queueNote({ ...payload, sign });
      window.dispatchEvent(new Event("outbox-changed"));
      toast.success("Offline - note queued, will sync when online");
      clearVisitTimer(patientId);
      setDraft(null);
      setTranscript("");
      setBusy("idle");
      return;
    }

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Save failed"));
      toast.success(sign ? "Note signed" : "Note saved as draft");
      clearVisitTimer(patientId);
      setDraft(null);
      setTranscript("");
      router.refresh();
    } catch (error) {
      await queueNote({ ...payload, sign });
      window.dispatchEvent(new Event("outbox-changed"));
      toast.warning(`Save failed (${(error as Error).message}) - queued for sync`);
      clearVisitTimer(patientId);
      setDraft(null);
      setTranscript("");
    } finally {
      setBusy("idle");
    }
  }

  return (
    <div className="voice-console">
      <div className="voice-console-top">
        <div className="flex min-w-0 items-center gap-4">
          <div
            className={cn(
              "relative inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white shadow-lg",
              recording && "recording-ring"
            )}
          >
            {recording ? <AudioWaveform className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black tracking-tight text-slate-900">Voice capture console</h3>
              <span className={cn("badge", recording ? "badge-danger" : draft ? "badge-success" : "badge-neutral")}>
                {recording ? "Recording" : draft ? "SOAP ready" : busy === "idle" ? "Ready" : "Processing"}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Capture visit narrative, structure SOAP, then save or sign.
            </p>
          </div>
        </div>
        <div className={cn("waveform", recording && "is-recording")} aria-hidden="true">
          {Array.from({ length: 18 }).map((_, index) => (
            <span key={index} />
          ))}
        </div>
      </div>

      <div className="space-y-4 p-4">
        {!canRecord && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
            Voice recording unavailable in this browser. Use Chrome, Edge, or Safari 17+.
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <label className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Language</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={recording || busy !== "idle"}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-[var(--ring)]"
              aria-label="Recording language"
            >
              {LANGUAGES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Visit type</span>
            <select
              value={visitType}
              onChange={(e) => setVisitType(e.target.value)}
              disabled={recording || busy !== "idle"}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-[var(--ring)]"
              aria-label="Visit type"
            >
              <option value="RN_VISIT">RN visit</option>
              <option value="MD_VISIT">MD visit</option>
              <option value="SW_VISIT">SW visit</option>
              <option value="CHAPLAIN_VISIT">Chaplain visit</option>
              <option value="AIDE_VISIT">Aide visit</option>
              <option value="VOLUNTEER_VISIT">Volunteer visit</option>
              <option value="IDG_MEETING">IDG meeting</option>
              <option value="PHONE">Phone</option>
            </select>
          </label>
          {!recording ? (
            <button
              type="button"
              onClick={start}
              disabled={busy !== "idle" || !canRecord}
              className="btn-primary mt-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm disabled:opacity-50"
            >
              <Mic className="h-4 w-4" />
              Start
            </button>
          ) : (
            <button
              type="button"
              onClick={stop}
              className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
            >
              <Square className="h-4 w-4 fill-white" />
              Stop and process
            </button>
          )}
        </div>

        <div className="pipeline">
          <PipelineStep label="Capture" active={recording} done={Boolean(transcript || draft)} />
          <PipelineStep label="Transcribe" active={busy === "transcribing"} done={Boolean(transcript)} />
          <PipelineStep label="SOAP" active={busy === "structuring"} done={Boolean(draft)} />
          <PipelineStep label="Ready" active={Boolean(draft)} done={Boolean(draft)} />
        </div>

        {transcript && (
          <details className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-black text-slate-800">
              <FileText className="h-4 w-4 text-teal-700" />
              Source transcript
            </summary>
            <div className="mt-3 space-y-2">
              <div>
                <div className="mb-1 text-xs text-slate-500">Transcript (English)</div>
                <div className="text-slate-700">{transcript}</div>
              </div>
              {transcriptOriginal && transcriptOriginal !== transcript && (
                <div className="border-t border-slate-200 pt-2">
                  <div className="mb-1 text-xs text-slate-500">
                    Original ({LANGUAGES.find((item) => item.code === language)?.label})
                  </div>
                  <div className="text-slate-700" dir={["ar", "ur"].includes(language) ? "rtl" : "ltr"}>
                    {transcriptOriginal}
                  </div>
                </div>
              )}
            </div>
          </details>
        )}

        {draft && (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center gap-2 border-b border-slate-200 bg-[var(--surface-muted)] px-4 py-3">
              <WandSparkles className="h-4 w-4 text-teal-700" />
              <div className="text-sm font-black text-slate-900">SOAP worksheet</div>
            </div>
            <div className="soap-grid p-3">
              <SoapField label="Subjective" value={draft.subjective} onChange={(value) => setDraft({ ...draft, subjective: value })} />
              <SoapField label="Objective" value={draft.objective} onChange={(value) => setDraft({ ...draft, objective: value })} />
              <SoapField label="Assessment" value={draft.assessment} onChange={(value) => setDraft({ ...draft, assessment: value })} />
              <SoapField label="Plan" value={draft.plan} onChange={(value) => setDraft({ ...draft, plan: value })} />
            </div>

            {(draft.esas || draft.pps !== undefined || draft.medChanges?.length) && (
              <div className="mx-3 mb-3 space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                <div className="mb-1 flex items-center gap-2 font-black text-slate-700">
                  <Bot className="h-3.5 w-3.5" />
                  AI-extracted data
                </div>
                {draft.pps !== undefined && draft.pps !== null && (
                  <div>
                    PPS: <span className="font-mono">{draft.pps}</span>
                  </div>
                )}
                {draft.esas && (
                  <div>
                    ESAS: <span className="font-mono">{JSON.stringify(draft.esas)}</span>
                  </div>
                )}
                {draft.medChanges && draft.medChanges.length > 0 && <div>Med changes: {draft.medChanges.join("; ")}</div>}
                {draft.icd10 && draft.icd10.length > 0 && (
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">ICD-10 codes</label>
                    <input
                      value={draft.icd10.map(formatIcd10).join(", ")}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          icd10: event.target.value
                            .split(",")
                            .map((value) => value.replace(/\([^)]*\)/g, "").trim())
                            .filter(Boolean),
                        })
                      }
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 font-mono text-xs"
                    />
                  </div>
                )}
                {draft.confidence !== undefined && <div>Confidence: {Math.round((draft.confidence ?? 0) * 100)}%</div>}
              </div>
            )}

            <div className="sticky-action-bar flex gap-2 justify-end p-3">
              <button
                type="button"
                onClick={() => save(false)}
                disabled={busy !== "idle"}
                className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => save(true)}
                disabled={busy !== "idle"}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" />
                Sign & Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PipelineStep({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className={cn("pipeline-step", active && "is-active")}>
      {done ? <Check className="mb-1 h-3.5 w-3.5" /> : <span className="mb-1 block h-3.5 w-3.5 rounded-full bg-[var(--surface-muted)]" />}
      {label}
    </div>
  );
}

function SoapField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-[var(--surface-muted)] p-3">
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="min-h-28 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-4 focus:ring-[var(--ring)]"
      />
    </div>
  );
}

function formatIcd10(value: string | { code: string; confidence?: number }) {
  if (typeof value === "string") return value;
  if (typeof value.confidence === "number") {
    return `${value.code} (${Math.round(value.confidence * 100)}%)`;
  }
  return value.code;
}

async function readApiError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

function timerKey(patientId: string) {
  return `hospice-emr-visit-timer-${patientId}`;
}

function getVisitTiming(patientId: string) {
  if (typeof window === "undefined") return {};
  const stored = localStorage.getItem(timerKey(patientId));
  if (!stored) return {};
  const started = Number(stored);
  if (!Number.isFinite(started)) return {};
  return {
    visitStartedAt: new Date(started).toISOString(),
    visitDurationMin: Math.max(1, Math.round((Date.now() - started) / 60000)),
  };
}

function clearVisitTimer(patientId: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(timerKey(patientId));
  window.dispatchEvent(new Event("visit-timer-changed"));
}
