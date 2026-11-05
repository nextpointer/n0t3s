import { Note } from "./types";
import { dbGetAll, dbPut, dbDelete, dbGet } from "./db";
import { extractTags, legacyTagToToken } from "./tag-syntax";

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
 * A brand new note starts with nothing: empty title, empty body. The title
 * input takes focus so the first keystroke is the title, and Enter drops
 * straight into the body. Empty titles render as "Untitled" wherever notes
 * are listed.
 */
export const NEW_NOTE_CONTENT = "";

/** Set when a note is created, consumed once by the note page. */
const NEW_NOTE_FLAG = "n0t3s:new-note";

export async function createNote(title = ""): Promise<Note> {
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
  try {
    // Same-tab signal only: the note page reads and clears it.
    sessionStorage.setItem(NEW_NOTE_FLAG, "1");
  } catch {
    // sessionStorage unavailable — the note simply opens without pre-select.
  }
  return note;
}

export function consumeNewNoteFlag(): boolean {
  try {
    const set = sessionStorage.getItem(NEW_NOTE_FLAG) === "1";
    sessionStorage.removeItem(NEW_NOTE_FLAG);
    return set;
  } catch {
    return false;
  }
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

/**
 * Tags used to live in a separate `tags` field edited through an input row.
 * The inline `#mention` system reads tags out of the content instead, so the
 * old values are seeded into the note text (top of body, under the title) as
 * `#tag` tokens, then the field is left as-is for this one-time run.
 *
 * Runs once, behind a flag record; already-mentioned tags are skipped, so a
 * retry after a partial failure is safe. `updatedAt` is deliberately not
 * touched — re-tagging metadata would lie about when the note was edited.
 */
export async function migrateTagsToInline(): Promise<void> {
  const FLAG = "tags-inline-migrated";
  try {
    const flag = await dbGet<{ id: string; value: boolean }>(FLAG);
    if (flag?.value) return;

    const records = await dbGetAll<unknown>();
    for (const record of records) {
      if (!isNote(record)) continue;

      // Compare sanitised tokens on both sides: "machine learning" was
      // seeded as "#machine-learning", so a retry must not match the raw
      // legacy string against the mention list — or every restart after a
      // partial failure would prepend the line again.
      const inline = new Set(extractTags(record.content));
      const tokens: string[] = [];
      const seen = new Set<string>();
      for (const tag of record.tags ?? []) {
        const token = legacyTagToToken(tag);
        if (!token || seen.has(token) || inline.has(token)) continue;
        seen.add(token);
        tokens.push(token);
      }
      if (tokens.length === 0) continue;

      const tokenLine = tokens.map((token) => `#${token}`).join(" ");
      const content = record.content.trim()
        ? `${tokenLine}\n\n${record.content}`
        : tokenLine;
      await dbPut(normalizeNote({ ...record, content }));
    }

    await dbPut({ id: FLAG, value: true });
  } catch {
    // No flag set on failure: the next run retries, and mention-aware
    // skipping keeps a half-finished pass from duplicating tags.
  }
}
