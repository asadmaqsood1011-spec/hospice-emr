"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { queueNote } from "@/lib/outbox";

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
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "zh", label: "中文" },
  { code: "hi", label: "हिन्दी" },
  { code: "ar", label: "العربية" },
  { code: "ur", label: "اردو" },
];

export function VoiceNoteRecorder({ patientId }: { patientId: string }) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState<"idle" | "transcribing" | "structuring" | "saving">("idle");
  const [transcript, setTranscript] = useState("");
  const [transcriptOriginal, setTranscriptOriginal] = useState("");
  const [language, setLanguage] = useState("en");
  const [visitType, setVisitType] = useState("RN_VISIT");
  const [draft, setDraft] = useState<SoapDraft | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        process(blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch (e) {
      toast.error("Microphone access denied");
      console.error(e);
    }
  }

  function stop() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function process(blob: Blob) {
    setBusy("transcribing");
    try {
      const fd = new FormData();
      fd.append("audio", blob, "note.webm");
      fd.append("language", language);
      const tRes = await fetch("/api/transcribe", { method: "POST", body: fd });
      if (!tRes.ok) throw new Error("Transcription failed");
      const { transcript: txt, transcriptOriginal: orig } = await tRes.json();
      setTranscript(txt);
      setTranscriptOriginal(orig ?? "");

      setBusy("structuring");
      const sRes = await fetch("/api/soap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: txt, patientId }),
      });
      if (!sRes.ok) throw new Error("SOAP structuring failed");
      const soap = await sRes.json();
      setDraft(soap);
      toast.success("SOAP draft ready — review and sign");
    } catch (e) {
      toast.error((e as Error).message);
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
      toast.success("Offline — note queued, will sync when online");
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
      if (!res.ok) throw new Error("Save failed");
      toast.success(sign ? "Note signed" : "Note saved as draft");
      clearVisitTimer(patientId);
      setDraft(null);
      setTranscript("");
      window.location.reload();
    } catch (e) {
      // Network failed mid-request — queue it
      await queueNote({ ...payload, sign });
      window.dispatchEvent(new Event("outbox-changed"));
      toast.warning(`Save failed (${(e as Error).message}) — queued for sync`);
      clearVisitTimer(patientId);
      setDraft(null);
      setTranscript("");
    } finally {
      setBusy("idle");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={recording || busy !== "idle"}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 font-medium"
          aria-label="Recording language"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
        <select
          value={visitType}
          onChange={(e) => setVisitType(e.target.value)}
          disabled={recording || busy !== "idle"}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 font-medium"
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
        {!recording ? (
          <button
            type="button"
            onClick={start}
            disabled={busy !== "idle"}
            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-white" />
            Start Recording
          </button>
        ) : (
          <button
            type="button"
            onClick={stop}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 flex items-center gap-2 animate-pulse"
          >
            <span className="w-2 h-2 rounded-sm bg-white" />
            Stop & Process
          </button>
        )}
        {busy !== "idle" && (
          <span className="text-sm text-slate-500 animate-pulse">
            {busy === "transcribing" && "Transcribing audio..."}
            {busy === "structuring" && "AI structuring SOAP..."}
            {busy === "saving" && "Saving..."}
          </span>
        )}
      </div>

      {transcript && (
        <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-2">
          <div>
            <div className="text-xs text-slate-500 mb-1">Transcript (English)</div>
            <div className="text-slate-700">{transcript}</div>
          </div>
          {transcriptOriginal && transcriptOriginal !== transcript && (
            <div className="pt-2 border-t border-slate-200">
              <div className="text-xs text-slate-500 mb-1">
                Original ({LANGUAGES.find((l) => l.code === language)?.label})
              </div>
              <div className="text-slate-700" dir={["ar", "ur"].includes(language) ? "rtl" : "ltr"}>
                {transcriptOriginal}
              </div>
            </div>
          )}
        </div>
      )}

      {draft && (
        <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
          <SoapField
            label="Subjective"
            value={draft.subjective}
            onChange={(v) => setDraft({ ...draft, subjective: v })}
          />
          <SoapField
            label="Objective"
            value={draft.objective}
            onChange={(v) => setDraft({ ...draft, objective: v })}
          />
          <SoapField
            label="Assessment"
            value={draft.assessment}
            onChange={(v) => setDraft({ ...draft, assessment: v })}
          />
          <SoapField
            label="Plan"
            value={draft.plan}
            onChange={(v) => setDraft({ ...draft, plan: v })}
          />

          {(draft.esas || draft.pps !== undefined || draft.medChanges?.length) && (
            <div className="p-3 bg-slate-50 text-xs space-y-1">
              <div className="font-semibold text-slate-700 mb-1">AI-extracted data</div>
              {draft.pps !== undefined && draft.pps !== null && (
                <div>PPS: <span className="font-mono">{draft.pps}</span></div>
              )}
              {draft.esas && (
                <div>ESAS: <span className="font-mono">{JSON.stringify(draft.esas)}</span></div>
              )}
              {draft.medChanges && draft.medChanges.length > 0 && (
                <div>Med changes: {draft.medChanges.join("; ")}</div>
              )}
              {draft.icd10 && draft.icd10.length > 0 && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ICD-10 codes</label>
                  <input
                    value={draft.icd10.map(formatIcd10).join(", ")}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        icd10: e.target.value
                          .split(",")
                          .map((v) => v.replace(/\([^)]*\)/g, "").trim())
                          .filter(Boolean),
                      })
                    }
                    className="w-full px-2 py-1.5 text-xs font-mono border border-slate-200 rounded bg-white"
                  />
                </div>
              )}
              {draft.confidence !== undefined && (
                <div>Confidence: {Math.round((draft.confidence ?? 0) * 100)}%</div>
              )}
            </div>
          )}

          <div className="p-3 flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => save(false)}
              disabled={busy !== "idle"}
              className="px-4 py-2 text-sm rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => save(true)}
              disabled={busy !== "idle"}
              className="px-4 py-2 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Sign & Save
            </button>
          </div>
        </div>
      )}
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
  onChange: (v: string) => void;
}) {
  return (
    <div className="p-3">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded resize-y focus:outline-none focus:ring-1 focus:ring-slate-900"
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
