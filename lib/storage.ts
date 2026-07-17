import { Note } from "./types";
import { dbGetAll, dbPut, dbDelete, dbGet } from "./db";

// All functions are now async — non-blocking main thread

export async function getNotes(): Promise<Note[]> {
  try {
    return await dbGetAll<Note>();
  } catch {
    return [];
  }
}

export async function saveNotes(notes: Note[]): Promise<void> {
  for (const note of notes) {
    await dbPut(note);
  }
}

export async function addNote(note: Note): Promise<void> {
  await dbPut(note);
}

export async function updateNote(updatedNote: Note): Promise<void> {
  await dbPut(updatedNote);
}

export async function deleteNote(id: string): Promise<void> {
  await dbDelete(id);
}

export async function getNote(id: string): Promise<Note | undefined> {
  return await dbGet<Note>(id);
}

// One-time migration from localStorage to IndexedDB
export async function migrateFromLocalStorage(): Promise<void> {
  const MIGRATED_KEY = "n0t3s-migrated-to-idb";
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATED_KEY)) return;

  const raw =
    localStorage.getItem("n0t3s-storage:v1") ||
    localStorage.getItem("n0t3s-storage");
  if (raw) {
    try {
      const notes: Note[] = JSON.parse(raw);
      for (const note of notes) {
        await dbPut(note);
      }
    } catch {
      // corrupted localStorage data — skip migration
    }
  }

  localStorage.setItem(MIGRATED_KEY, "true");
}
