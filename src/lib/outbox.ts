"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type OutboxNote = {
  id?: number;
  patientId: string;
  transcript?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  esas?: Record<string, number | null> | null;
  pps?: number | null;
  medChanges?: string[];
  icd10?: string[];
  confidence?: number;
  sign: boolean;
  audioBlob?: Blob;
  createdAt: number;
  lastAttempt?: number;
  attempts: number;
  lastError?: string;
};

interface OutboxDB extends DBSchema {
  notes: {
    key: number;
    value: OutboxNote;
    indexes: { "by-createdAt": number };
  };
}

const DB_NAME = "hospice-emr-outbox";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<OutboxDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<OutboxDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore("notes", { keyPath: "id", autoIncrement: true });
        store.createIndex("by-createdAt", "createdAt");
      },
    });
  }
  return dbPromise;
}

export async function queueNote(note: Omit<OutboxNote, "id" | "createdAt" | "attempts">): Promise<number> {
  const db = await getDb();
  return db.add("notes", {
    ...note,
    createdAt: Date.now(),
    attempts: 0,
  });
}

export async function listOutbox(): Promise<OutboxNote[]> {
  const db = await getDb();
  return db.getAllFromIndex("notes", "by-createdAt");
}

export async function countOutbox(): Promise<number> {
  const db = await getDb();
  return db.count("notes");
}

export async function removeFromOutbox(id: number): Promise<void> {
  const db = await getDb();
  await db.delete("notes", id);
}

export async function markFailure(id: number, error: string): Promise<void> {
  const db = await getDb();
  const note = await db.get("notes", id);
  if (!note) return;
  note.attempts += 1;
  note.lastAttempt = Date.now();
  note.lastError = error;
  await db.put("notes", note);
}
