import { Note } from "./types";

// Storage keys
const NOTES_KEY = "n0t3s-storage:v1";

// get the Notes
export const getNotes = (): Note[] => {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(NOTES_KEY);
  try {
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

// save the Notes
export const saveNotes = (notes: Note[]): void => {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch {
    // Storage full or unavailable
  }
};
// add Note
export const addNote = (note: Note): void => {
  const existingNote = getNotes();
  existingNote.push(note);
  saveNotes(existingNote);
};
// update the Note
export const updateNote = (updatedNote: Note): void => {
  const newNote = getNotes().map((note) =>
    note.id === updatedNote.id ? updatedNote : note,
  );
  saveNotes(newNote);
};
// delete note
export const deleteNote = (id: string): void => {
  const newNote = getNotes().filter((note) => note.id !== id);
  saveNotes(newNote);
};
