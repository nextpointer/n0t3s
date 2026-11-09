import { atom } from "jotai";
import { Note } from "@/lib/types";
import { dbGet, dbPut } from "@/lib/db";
import { deleteNote } from "@/lib/storage";

// PERSISTED SETTINGS ATOMS
// Plain atoms with defaults; loaded from IndexedDB on mount.
export const autoSaveAtom = atom<boolean>(true);
export const zenMode = atom<boolean>(false);
/**
 * Whether the editor formatting toolbar is visible.
 * On phones it is pinned above the on-screen keyboard.
 */
export const toolbarEnabledAtom = atom<boolean>(true);
/**
 * Turns every AI entry point off (menu, ask dialog, command palette actions,
 * keyboard shortcuts) for people who never want to send text anywhere.
 */
export const aiEnabledAtom = atom<boolean>(true);

/**
 * Colour for rendered preview (headings, bold, italic, quotes, links).
 * When off the preview goes monochrome; syntax-highlighted code keeps its
 * colours either way, because Shiki sets those inline per token.
 */
export const previewColorsAtom = atom<boolean>(true);

/** Editor font size in px, applied to both desktop and mobile. */
export const editorFontSizeAtom = atom<number>(15);

/** Native browser spellcheck in the note editor. */
export const spellCheckAtom = atom<boolean>(false);

/** Editor view mode. Shared so the toolbar and the bottom bar stay in sync. */
export type ViewMode = "edit" | "plain" | "preview";
export const viewModeAtom = atom<ViewMode>("edit");

// Load persisted settings from IndexedDB into atoms on mount.
// Call once from the root layout's useEffect.
export async function loadPersistedSettings(
  setAutoSave: (v: boolean) => void,
  setZenMode: (v: boolean) => void,
  setToolbarEnabled: (v: boolean) => void,
  setAiEnabled: (v: boolean) => void,
  setPreviewColors: (v: boolean) => void,
  setEditorFontSize: (v: number) => void,
  setSpellCheck: (v: boolean) => void,
) {
  try {
    const autoSave = await dbGet<{ id: string; value: boolean }>("autoSave");
    if (autoSave) setAutoSave(autoSave.value);
  } catch {
    // ignore
  }
  try {
    const zen = await dbGet<{ id: string; value: boolean }>("zenMode");
    if (zen) setZenMode(zen.value);
  } catch {
    // ignore
  }
  try {
    const toolbar = await dbGet<{ id: string; value: boolean }>("toolbarEnabled");
    if (toolbar) setToolbarEnabled(toolbar.value);
  } catch {
    // ignore
  }
  try {
    const ai = await dbGet<{ id: string; value: boolean }>("aiEnabled");
    if (ai) setAiEnabled(ai.value);
  } catch {
    // ignore
  }
  try {
    const pc = await dbGet<{ id: string; value: boolean }>("previewColors");
    if (pc) setPreviewColors(pc.value);
  } catch {
    // ignore
  }
  try {
    const fs = await dbGet<{ id: string; value: number }>("editorFontSize");
    if (fs && typeof fs.value === "number") setEditorFontSize(fs.value);
  } catch {
    // ignore
  }
  try {
    const sc = await dbGet<{ id: string; value: boolean }>("spellCheck");
    if (sc) setSpellCheck(sc.value);
  } catch {
    // ignore
  }
}

// Persist helpers — fire and forget writes to IndexedDB
export function persistAutoSave(value: boolean) {
  dbPut({ id: "autoSave", value }).catch(() => {});
}

export function persistZenMode(value: boolean) {
  dbPut({ id: "zenMode", value }).catch(() => {});
}

export function persistToolbarEnabled(value: boolean) {
  dbPut({ id: "toolbarEnabled", value }).catch(() => {});
}

export function persistAiEnabled(value: boolean) {
  dbPut({ id: "aiEnabled", value }).catch(() => {});
}

export function persistPreviewColors(value: boolean) {
  dbPut({ id: "previewColors", value }).catch(() => {});
}

export function persistEditorFontSize(value: number) {
  dbPut({ id: "editorFontSize", value }).catch(() => {});
}

export function persistSpellCheck(value: boolean) {
  dbPut({ id: "spellCheck", value }).catch(() => {});
}

//for search pallate state
export const search = atom<false | "commands" | "notes">(false);

// NOTE DATA ATOMS
// Currently active note being viewed/edited
export const currentNoteAtom = atom<Note | null>(null);

// All available tags from all notes
export const allTagsAtom = atom<string[]>([]);

// EDITING STATE ATOMS
/**
 * Current note title being edited
 * Synced with NoteTitle component
 */
export const titleAtom = atom<string>("");

/**
 * Current note content
 * Main source of truth for note content
 * Synced from editor via syncEditorToContentAtom
 */
export const contentAtom = atom<string>("");

// UI STATE ATOMS
/**
 * Indicates if current note has unsaved changes
 * Used to show save prompt when navigating away
 */
export const unsavedAtom = atom<boolean>(false);

/**
 * Indicates if save operation is in progress
 * Used to show loading state on save button
 */
export const saveLoadingAtom = atom<boolean>(false);

/**
 * Indicates if page is loading initial note data
 * Used to show loader until note is ready
 */
export const pageLoadingAtom = atom<boolean>(true);

/**
 * Indicates if AI operation is in progress
 * Used to show loading state in AI dialog
 */
export const aiLoadingAtom = atom<boolean>(false);

// DIALOG STATE ATOMS
/**
 *
 * Controls delete confirmation dialog visibility
 */
export const deleteDialogOpenAtom = atom<boolean>(false);

/**
 * Controls Edit with AI dialog visibility
 */
export const editAIDialogOpenAtom = atom<boolean>(false);
/** @deprecated use editAIDialogOpenAtom */
export const askDialogOpenAtom = editAIDialogOpenAtom;

/** Selection captured when opening Edit with AI (apply edit to this range only). */
export type EditAISelection = { text: string; start: number; end: number; base: string } | null;
export const editAISelectionAtom = atom<EditAISelection>(null);

/**
 * Controls save prompt dialog visibility
 * Shown when user tries to navigate with unsaved changes
 */
export const savePromptDialogOpenAtom = atom<boolean>(false);

/**
 * Controls export dialog visibility
 */
export const exportDialogOpenAtom = atom<boolean>(false);

/**
 * Stores target route when user tries to navigate with unsaved changes
 * Used to redirect after save/discard decision
 */
export const navigationTargetAtom = atom<string | null>(null);

// HISTORY STATE ATOMS (Undo/Redo)
//
// Removed: the app previously kept a parallel snapshot history here so the
// toolbar could undo/redo. It rebuilt content through programmatic
// `setValue`, which cleared the browser's native undo stack on every press
// and could yank the caret — the opposite of syncing with the OS undo
// system. Undo/redo now all ride the textarea's native stack (see
// HistoryControls), which OverType itself preserves for formatting actions.

// ACTION ATOMS (Write-only)

/**
 * Flips true once boot-time storage maintenance has finished — the
 * localStorage→IndexedDB migration and the one-time legacy-tags→inline
 * migration. Note/list loading effects gate on this so the first
 * initialization (and its autosave afterwards) can never read or overwrite
 * a record while the tag migration is halfway through rewriting it: a save
 * that lands in that window would persist pre-migration content and drop
 * the note's legacy tags forever.
 */
export const storageReadyAtom = atom<boolean>(false);

/**
 * Checks if current note has unsaved changes
 * Compares current editing state with original note data
 * Updates unsavedAtom accordingly
 *
 * Called after any edit (title, content). Tags are `#mentions` inside the
 * content, so a tag change shows up as a content change — there is no
 * separate tag list to compare.
 */
export const checkUnsavedAtom = atom(null, (get, set) => {
  const note = get(currentNoteAtom);
  if (!note) return;

  const title = get(titleAtom);
  const content = get(contentAtom);

  // Compare current state with original note
  const changed = title !== note.title || content !== note.content;

  set(unsavedAtom, changed);
});

/**
 * Initializes all editing atoms with note data
 * Called when loading a note (new or existing)
 *
 * CRITICAL: This is the single source of truth for note initialization
 * All atoms are reset here to ensure clean state
 *
 * @param note - The note object to initialize with
 */
export const initializeNoteAtom = atom(null, (get, set, note: Note) => {
  // Set current note reference
  set(currentNoteAtom, note);

  // Initialize editing state
  set(titleAtom, note.title);
  set(contentAtom, note.content);

  // Reset UI state
  set(unsavedAtom, false);
  set(pageLoadingAtom, false);
});

/**
 * Syncs editor changes to main content atom
 * Called by NoteContent component after debounced typing
 *
 * This is the bridge between isolated editor and app state:
 * 1. Updates contentAtom (source of truth)
 * 2. Checks for unsaved changes
 *
 * Undo/redo bookkeeping is intentionally absent: the textarea's native
 * stack (driven by the browser, not app state) owns history.
 *
 * @param newContent - Latest content from editor
 */

/**
 * Silently removes the note currently being edited when it holds nothing:
 * no title, no content, no tags. Called wherever the note page is left —
 * the back arrow, the save prompt, a palette jump, or unmount — so notes the
 * user abandoned before writing a word never litter the list as "Untitled".
 *
 * Passing @noteId only discards when it matches the open note, which lets the
 * note-safe cleanup run in unmount effects without racing the next note's
 * initialization. No toast, no prompt: an empty note has nothing to save or
 * lose.
 */
export const discardEmptyNoteAtom = atom(
  null,
  async (get, set, ...args: unknown[]): Promise<boolean> => {
    const noteId = args[0] as string | undefined;
    const note = get(currentNoteAtom);
    if (!note) return false;
    if (noteId && note.id !== noteId) return false;

    const title = (get(titleAtom) || "").trim();
    const content = (get(contentAtom) || "").trim();
    // `#tag` mentions are also content, so a note carrying only a tag is
    // never considered empty — the user typed something.
    if (title || content) return false;

    try {
      await deleteNote(note.id);
    } catch {
      return false;
    }
    set(currentNoteAtom, null);
    set(unsavedAtom, false);
    return true;
  },
);

export const syncEditorToContentAtom = atom(
  null,
  (get, set, newContent: string) => {
    const current = get(contentAtom);

    // Skip if content hasn't changed
    if (newContent === current) return;

    // Update main content
    set(contentAtom, newContent);

    // Check for unsaved changes
    const note = get(currentNoteAtom);
    if (!note) return;

    const title = get(titleAtom);

    const changed = title !== note.title || newContent !== note.content;

    set(unsavedAtom, changed);
  },
);
