"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SolarIcon } from "@/lib/icons";
import { getNoteEditor } from "@/lib/editor-registry";
import { cn } from "@/lib/utils";

function canDo(command: "undo" | "redo"): boolean {
  try {
    // Best-effort: reflects the focused editable's history in supporting browsers.
    return document.queryCommandEnabled(command);
  } catch {
    return false;
  }
}

function nativeHistory(command: "undo" | "redo"): void {
  const textarea = getNoteEditor()?.textarea;
  if (!textarea) return;
  if (document.activeElement !== textarea) {
    textarea.focus({ preventScroll: true });
  }
  document.execCommand(command);
}

export const HistoryControls = memo(function HistoryControls() {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const refresh = useCallback(() => {
    const ta = getNoteEditor()?.textarea;
    const active = document.activeElement === ta;
    // queryCommandEnabled is most reliable when the textarea has focus.
    if (ta && !active) {
      setCanUndo((v) => v); // keep current heuristic
      setCanRedo((v) => v);
      return;
    }
    setCanUndo(canDo("undo"));
    setCanRedo(canDo("redo"));
  }, []);

  useEffect(() => {
    const onInput = () => {
      // A new edit enables undo and clears redo (native behavior).
      setCanUndo(true);
      setCanRedo(false);
    };
    const onHistoryKey = () => setTimeout(refresh, 0);
    const onFocus = () => setTimeout(refresh, 0);
    const onExternal = () => {
      setCanUndo(true);
      setCanRedo(false);
      setTimeout(refresh, 0);
    };
    document.addEventListener("input", onInput, true);
    document.addEventListener("keyup", onHistoryKey);
    document.addEventListener("focusin", onFocus);
    window.addEventListener("note:history", onExternal as EventListener);
    const id = window.setInterval(refresh, 1200);
    refresh();
    return () => {
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("keyup", onHistoryKey);
      document.removeEventListener("focusin", onFocus);
      window.removeEventListener("note:history", onExternal as EventListener);
      window.clearInterval(id);
    };
  }, [refresh]);

  const handleUndo = useCallback(() => {
    nativeHistory("undo");
    setTimeout(refresh, 0);
  }, [refresh]);
  const handleRedo = useCallback(() => {
    nativeHistory("redo");
    setTimeout(refresh, 0);
  }, [refresh]);

  const keepFocus = (e: React.MouseEvent) => e.preventDefault();
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={keepFocus}
        onClick={handleUndo}
        aria-label="Undo"
        title="Undo (Ctrl/Cmd+Z)"
        className={cn(!canUndo && "opacity-35")}
      >
        <SolarIcon icon="undo" className={cn("h-4 w-4 transition-all", canUndo ? "text-foreground opacity-100 scale-110" : "text-foreground/45 opacity-55")} />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={keepFocus}
        onClick={handleRedo}
        aria-label="Redo"
        title="Redo (Ctrl/Cmd+Shift+Z)"
        className={cn(!canRedo && "opacity-35")}
      >
        <SolarIcon icon="redo" className={cn("h-4 w-4 transition-all", canRedo ? "text-foreground opacity-100 scale-110" : "text-foreground/45 opacity-55")} />
      </Button>
    </>
  );
});
