"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";

type SoapDraft = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  esas?: Record<string, number | null>;
  pps?: number | null;
  medChanges?: string[];
  icd10?: string[];
  confidence?: number;
};

export function VoiceNoteRecorder({ patientId }: { patientId: string }) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState<"idle" | "transcribing" | "structuring" | "saving">("idle");
  const [transcript, setTranscript] = useState("");
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
      const tRes = await fetch("/api/transcribe", { method: "POST", body: fd });
      if (!tRes.ok) throw new Error("Transcription failed");
      const { transcript: txt } = await tRes.json();
      setTranscript(txt);

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
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, transcript, ...draft, sign }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success(sign ? "Note signed" : "Note saved as draft");
      setDraft(null);
      setTranscript("");
      window.location.reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy("idle");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
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
        <div className="bg-slate-50 rounded-lg p-3 text-sm">
          <div className="text-xs text-slate-500 mb-1">Raw transcript</div>
          <div className="text-slate-700">{transcript}</div>
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
                <div>ICD-10: {draft.icd10.join(", ")}</div>
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
