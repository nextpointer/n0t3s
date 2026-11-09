import { getNoteEditor } from "@/lib/editor-registry";

export type EditorSelection = { text: string; start: number; end: number; base: string };

let lastSelection: EditorSelection | null = null;

export function rememberEditorSelection() {
  const ta = getNoteEditor()?.textarea;
  if (!ta || ta.selectionStart === ta.selectionEnd) return;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const base = ta.value;
  const text = base.slice(start, end);
  if (text.trim()) lastSelection = { text, start, end, base };
}

export function captureEditorSelection(): EditorSelection | null {
  const ta = getNoteEditor()?.textarea;
  if (ta && ta.selectionStart !== ta.selectionEnd) {
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const base = ta.value;
    const text = base.slice(start, end);
    if (text.trim()) {
      lastSelection = { text, start, end, base };
      return lastSelection;
    }
  }
  // Fallback: last remembered selection (survives focus loss to menus/dialogs)
  // only if it still maps to the current editor content.
  if (lastSelection && ta && ta.value === lastSelection.base) return lastSelection;
  return lastSelection && !ta ? lastSelection : null;
}

export function applyToSelection(sel: EditorSelection, replacement: string): string {
  return sel.base.slice(0, sel.start) + replacement + sel.base.slice(sel.end);
}
