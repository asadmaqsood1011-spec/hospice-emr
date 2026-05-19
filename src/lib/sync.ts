"use client";

import { listOutbox, removeFromOutbox, markFailure, type OutboxNote } from "./outbox";

export type SyncResult = { synced: number; failed: number };

export async function flushOutbox(): Promise<SyncResult> {
  if (!navigator.onLine) return { synced: 0, failed: 0 };

  const queued = await listOutbox();
  let synced = 0;
  let failed = 0;

  for (const note of queued) {
    if (!note.id) continue;
    try {
      const body = serializeForApi(note);
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await removeFromOutbox(note.id);
      synced++;
    } catch (e) {
      await markFailure(note.id, (e as Error).message);
      failed++;
    }
  }

  return { synced, failed };
}

function serializeForApi(n: OutboxNote) {
  return {
    patientId: n.patientId,
    visitId: n.visitId,
    visitType: n.visitType,
    visitDurationMin: n.visitDurationMin,
    visitStartedAt: n.visitStartedAt,
    transcript: n.transcript,
    transcriptOriginal: n.transcriptOriginal,
    language: n.language,
    subjective: n.subjective,
    objective: n.objective,
    assessment: n.assessment,
    plan: n.plan,
    esas: n.esas ?? undefined,
    pps: n.pps ?? undefined,
    medChanges: n.medChanges,
    icd10: n.icd10,
    confidence: n.confidence,
    sign: n.sign,
  };
}
