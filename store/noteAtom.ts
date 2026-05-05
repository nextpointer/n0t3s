import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { Note } from "@/lib/types";

// PERSISTED SETTINGS ATOM
export const autoSaveAtom = atomWithStorage<boolean>("autoSave", true);

// zen mode for editor
export const zenMode = atomWithStorage<boolean>("zenMode", true);

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

/**
 * Current note tags
 * Synced with TagInput component
 */
export const tagsAtom = atom<string[]>([]);

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
 * Controls Ask AI dialog visibility
 */
export const askDialogOpenAtom = atom<boolean>(false);

/**
 * Controls save prompt dialog visibility
 * Shown when user tries to navigate with unsaved changes
 */
export const savePromptDialogOpenAtom = atom<boolean>(false);

/**
 * Controls import/export dialog visibility
 */
export const importDialogOpenAtom = atom<boolean>(false);
export const exportDialogOpenAtom = atom<boolean>(false);

/**
 * Stores target route when user tries to navigate with unsaved changes
 * Used to redirect after save/discard decision
 */
export const navigationTargetAtom = atom<string | null>(null);

// HISTORY STATE ATOMS (Undo/Redo)

/**
 * Array of content snapshots for undo/redo
 * Each entry represents a state in history
 */
export const historyAtom = atom<string[]>([]);

/**
 * Current position in history array
 * Points to the current active state
 */
export const historyIndexAtom = atom<number>(-1);

/**
 * Computed atom: Returns true if undo is available
 * Used to enable/disable undo button
 */
export const canUndoAtom = atom((get) => get(historyIndexAtom) > 0);

/**
 * Computed atom: Returns true if redo is available
 * Used to enable/disable redo button
 */
export const canRedoAtom = atom((get) => {
  const history = get(historyAtom);
  const index = get(historyIndexAtom);
  return index < history.length - 1;
});

// ACTION ATOMS (Write-only)

/**
 * Checks if current note has unsaved changes
 * Compares current editing state with original note data
 * Updates unsavedAtom accordingly
 *
 * Called after any edit (title, content, tags)
 */
export const checkUnsavedAtom = atom(null, (get, set) => {
  const note = get(currentNoteAtom);
  if (!note) return;

  const title = get(titleAtom);
  const content = get(contentAtom);
  const tags = get(tagsAtom);

  // Compare current state with original note
  const changed =
    title !== note.title ||
    content !== note.content ||
    JSON.stringify(tags) !== JSON.stringify(note.tags || []);

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
  set(tagsAtom, note.tags || []);

  // Initialize history with current content
  set(historyAtom, [note.content]);
  set(historyIndexAtom, 0);

  // Reset UI state
  set(unsavedAtom, false);
  set(pageLoadingAtom, false);
});

/**
 * Adds new content to history for undo/redo
 * Truncates forward history if new content added after undo
 *
 * @param newContent - Content to add to history
 */
export const addToHistoryAtom = atom(null, (get, set, newContent: string) => {
  const history = get(historyAtom);
  const index = get(historyIndexAtom);

  // Don't add if content is same as current
  if (history[index] === newContent) return;

  // Remove any forward history (after current index)
  const newHistory = history.slice(0, index + 1);

  // Add new state
  newHistory.push(newContent);

  // Update atoms
  set(historyAtom, newHistory);
  set(historyIndexAtom, newHistory.length - 1);
});

/**
 * Undo action: Reverts to previous state in history
 * Updates contentAtom which triggers editor sync
 *
 * @returns Previous content or null if can't undo
 */
export const undoAtom = atom(null, (get, set) => {
  const index = get(historyIndexAtom);

  // Can't undo if at start of history
  if (index <= 0) return null;

  const history = get(historyAtom);
  const newIndex = index - 1;
  const newContent = history[newIndex];

  // Move back in history
  set(historyIndexAtom, newIndex);

  // Update content (triggers editor sync via useEffect)
  set(contentAtom, newContent);

  // Check if this creates unsaved changes
  set(checkUnsavedAtom);

  return newContent;
});

/**
 * Redo action: Moves forward to next state in history
 * Updates contentAtom which triggers editor sync
 *
 * @returns Next content or null if can't redo
 */
export const redoAtom = atom(null, (get, set) => {
  const history = get(historyAtom);
  const index = get(historyIndexAtom);

  // Can't redo if at end of history
  if (index >= history.length - 1) return null;

  const newIndex = index + 1;
  const newContent = history[newIndex];

  // Move forward in history
  set(historyIndexAtom, newIndex);

  // Update content (triggers editor sync via useEffect)
  set(contentAtom, newContent);

  // Check if this creates unsaved changes
  set(checkUnsavedAtom);

  return newContent;
});

/**
 * Syncs editor changes to main content atom
 * Called by NoteContent component after debounced typing
 *
 * This is the bridge between isolated editor and app state:
 * 1. Updates contentAtom (source of truth)
 * 2. Adds to history for undo/redo
 * 3. Checks for unsaved changes
 *
 * @param newContent - Latest content from editor
 */

// how many histories are capturing
const HISTORY_CAP = 10;

export const syncEditorToContentAtom = atom(
  null,
  (get, set, newContent: string) => {
    const current = get(contentAtom);

    // Skip if content hasn't changed
    if (newContent === current) return;

    // Update main content
    set(contentAtom, newContent);

    // Add to history
    const history = get(historyAtom);
    const index = get(historyIndexAtom);

    if (history[index] !== newContent) {
      const sliceStart = Math.max(0, index + 1 - HISTORY_CAP);
      // Truncate forward history
      const newHistory = history.slice(sliceStart, index + 1);

      // Add new state
      newHistory.push(newContent);

      // Update atoms
      set(historyAtom, newHistory);
      set(historyIndexAtom, newHistory.length - 1);
    }

    // Check for unsaved changes
    const note = get(currentNoteAtom);
    if (!note) return;

    const title = get(titleAtom);
    const tags = get(tagsAtom);

    const changed =
      title !== note.title ||
      newContent !== note.content ||
      JSON.stringify(tags) !== JSON.stringify(note.tags || []);

    set(unsavedAtom, changed);
  },
);
