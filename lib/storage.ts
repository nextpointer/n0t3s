import { Note } from "./types";
import { dbGetAll, dbPut, dbDelete, dbGet } from "./db";

// All functions are now async — non-blocking main thread

/**
 * The `notes` object store also holds app settings as `{ id, value }` records
 * (autoSave, zenMode, toolbarEnabled, …). A raw `getAll()` therefore returns
 * settings alongside real notes, which made them render in the note list as
 * untitled "Invalid Date" entries and crash the editor when opened.
 *
 * Shape-check rather than blacklist ids, so any future setting record is
 * filtered out too.
 */
function isNote(record: unknown): record is Note {
  if (!record || typeof record !== "object") return false;
  const n = record as Partial<Note>;
  return (
    typeof n.id === "string" &&
    typeof n.title === "string" &&
    typeof n.content === "string" &&
    typeof n.createdAt === "number"
  );
}

export async function getNotes(): Promise<Note[]> {
  try {
    const records = await dbGetAll<unknown>();
    return records.filter(isNote);
  } catch {
    return [];
  }
}

export async function saveNotes(notes: Note[]): Promise<void> {
  for (const note of notes) {
    if (isNote(note)) await dbPut(note);
  }
}

export async function addNote(note: Note): Promise<void> {
  await dbPut(normalizeNote(note));
}

export async function updateNote(updatedNote: Note): Promise<void> {
  await dbPut(normalizeNote(updatedNote));
}

/**
 * Content a brand new note starts with: the bare heading marker, which
 * NoteContent selects on open so the first Enter drops into the body.
 * Existing notes never match this exactly, so they are left untouched.
 */
export const NEW_NOTE_CONTENT = "# ";

/** Create and persist a new note, returning it so callers can navigate to it. */
export async function createNote(title = "Untitled Note"): Promise<Note> {
  const now = Date.now();
  const note: Note = {
    id: crypto.randomUUID(),
    title,
    content: NEW_NOTE_CONTENT,
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
  await addNote(note);
  return note;
}

export async function deleteNote(id: string): Promise<void> {
  await dbDelete(id);
}

export async function getNote(id: string): Promise<Note | undefined> {
  const record = await dbGet<unknown>(id);
  return isNote(record) ? record : undefined;
}

/** Fill in any missing text fields so persisted notes stay renderable. */
function normalizeNote(note: Note): Note {
  const now = Date.now();
  return {
    ...note,
    title: typeof note.title === "string" ? note.title : "",
    content: typeof note.content === "string" ? note.content : "",
    tags: Array.isArray(note.tags) ? note.tags : [],
    createdAt: typeof note.createdAt === "number" ? note.createdAt : now,
    updatedAt: typeof note.updatedAt === "number" ? note.updatedAt : now,
  };
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
        if (isNote(note)) await dbPut(normalizeNote(note));
      }
    } catch {
      // corrupted localStorage data — skip migration
    }
  }

  localStorage.setItem(MIGRATED_KEY, "true");
}
