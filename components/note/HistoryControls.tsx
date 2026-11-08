"use client";

import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { SolarIcon } from "@/lib/icons";
import { getNoteEditor } from "@/lib/editor-registry";

/**
 * Walk the browser's native undo/redo stack — the same one Ctrl+Z and the
 * OS edit menu drive. Keeping one stack for typing, formatting and these
 * buttons is what lets Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z and this toolbar behave
 * identically; the app-level snapshot history it replaces rebuilt unedited
 * documents on a parallel stack and its programmatic `setValue` wiped the
 * native one on every press.
 *
 * No toasts on purpose: undo and redo state is visible in the document
 * itself, and a "Nothing to undo" flash over a plain no-op is noise. Like
 * every OS edit menu the buttons stay enabled and simply do nothing when the
 * stack is empty.
 */
function nativeHistory(command: "undo" | "redo"): void {
  const textarea = getNoteEditor()?.textarea;
  if (!textarea) return;

  // execCommand targets the editable that has focus; the button click moves
  // focus to the button, so return it to the textarea first. If the document
  // was never focused this no-ops harmlessly.
  if (document.activeElement !== textarea) {
    textarea.focus({ preventScroll: true });
  }
  document.execCommand(command);
}

export const HistoryControls = memo(function HistoryControls() {
  // Native engine state (stack depth) is not observable, so the buttons rely
  // on the same affordance as browser edit menus: enabled, no-op when spent.
  const handleUndo = useCallback(() => nativeHistory("undo"), []);
  const handleRedo = useCallback(() => nativeHistory("redo"), []);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleUndo}
        aria-label="Undo"
        title="Undo (Ctrl/Cmd+Z)"
      >
        <SolarIcon icon="undo" className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRedo}
        aria-label="Redo"
        title="Redo (Ctrl/Cmd+Shift+Z)"
      >
        <SolarIcon icon="redo" className="w-4 h-4" />
      </Button>
    </>
  );
});
