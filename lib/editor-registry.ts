/**
 * Registry for the open note editor.
 *
 * The toolbar (HistoryControls) renders outside the editor component tree, so
 * it cannot read `editorRef` directly. NoteContent registers its instance on
 * mount and unregisters on teardown; the note editor is a singleton, so one
 * slot is all that is needed. Using glass-easel DOM queries instead would
 * risk grabbing the command palette's preview editor or the help page's
 * read-only demo.
 */

import type { ToolbarEditor } from "@/components/note/EditorToolbar";

let noteEditor: ToolbarEditor | null = null;

export function registerNoteEditor(editor: ToolbarEditor | null): void {
  noteEditor = editor;
}

export function getNoteEditor(): ToolbarEditor | null {
  return noteEditor;
}
