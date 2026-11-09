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

/**
 * Replace the captured selection in the live editor as a single, undoable step.
 * Returns the new full content, or null if the editor/selection is no longer valid
 * (caller should fall back to a full-content update).
 */
export function applyReplacementToEditor(sel: EditorSelection, replacement: string): string | null {
  const editor = getNoteEditor();
  const ta = editor?.textarea as HTMLTextAreaElement | undefined;
  if (!ta) return null;
  // Positions are only valid against the same base content.
  if (ta.value !== sel.base) return null;
  try {
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(sel.start, sel.end);
    let ok = false;
    try {
      ok = document.execCommand("insertText", false, replacement);
    } catch {
      ok = false;
    }
    if (!ok) {
      try {
        ta.setRangeText(replacement, sel.start, sel.end, "end");
        ta.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: replacement }));
        ok = true;
      } catch {
        ok = false;
      }
    }
    if (!ok) return null;
    try { (editor as unknown as { updatePreview?: () => void } | null)?.updatePreview?.(); } catch {}
    window.dispatchEvent(new CustomEvent("note:history"));
    window.dispatchEvent(new CustomEvent("note:ai-applied"));
    return ta.value;
  } catch {
    return null;
  }
}
