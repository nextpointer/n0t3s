import { useEffect, useCallback, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  contentAtom,
  aiLoadingAtom,
  checkUnsavedAtom,
  zenMode,
  persistZenMode,
  aiEnabledAtom,
} from "@/store/noteAtom";
import { UseAIActions } from "@/hooks/useAIActions";
import { captureEditorSelection, applyToSelection, applyReplacementToEditor } from "@/lib/ai-selection";
import { getNoteEditor } from "@/lib/editor-registry";
import toast from "react-hot-toast";

export function UseAIShortcuts() {
  const aiEnabled = useAtomValue(aiEnabledAtom);
  const content = useAtomValue(contentAtom);
  const loading = useAtomValue(aiLoadingAtom);
  const setContent = useSetAtom(contentAtom);
  const checkUnsaved = useSetAtom(checkUnsavedAtom);
  const setZenMode = useSetAtom(zenMode);
  const { executeAction } = UseAIActions();

  const handleAIAction = useCallback(
    async (action: string) => {
      const sel = captureEditorSelection();
      const target = sel ? sel.text : content;
      if (!target?.trim()) {
        toast.error("Not able to edit");
        return;
      }
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const result = await executeAction(action as any, target, undefined, sel ? { noteContext: sel.base } : undefined);
      if (result) {
        if (sel) {
          const next = applyReplacementToEditor(sel, result);
          if (next != null) {
            setContent(next);
            checkUnsaved();
          } else {
            const ta = getNoteEditor()?.textarea as HTMLTextAreaElement | undefined;
            if (ta && ta.value !== sel.base) {
              toast.error("Selection changed — try again");
            } else {
              setContent(applyToSelection(sel, result));
              checkUnsaved();
            }
          }
        } else {
          setContent(result);
          checkUnsaved();
        }
      }
    },
    [content, executeAction, setContent, checkUnsaved],
  );

  const handleAIActionRef = useRef(handleAIAction);
  useEffect(() => {
    handleAIActionRef.current = handleAIAction;
  });

  useEffect(() => {
    if (loading) return;

    const SHORTCUTS: Record<string, string> = {
      "Control+Shift+s": "summarize",
      "Control+Shift+r": "rewrite",
      "Control+Shift+g": "grammar",
      "Control+Shift+e": "expand",
      "Control+Shift+m": "simplify",
      "Control+Shift+q": "todo",
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Zen mode toggle: Ctrl/Cmd+Shift+Space — not an AI action, so this
      // stays registered even when AI is switched off.
      //
      // Deliberately NOT Ctrl/Cmd+Shift+Z: that is the OS-standard redo
      // gesture (and the browser's redo for the textarea), and toggling zen
      // on top of it made redo hijack the window.
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "Space") {
        e.preventDefault();
        setZenMode((prev) => {
          const next = !prev;
          persistZenMode(next);
          return next;
        });
        return;
      }

      if (!aiEnabled) return;

      const key = `${e.ctrlKey ? "Control+" : ""}${e.metaKey ? "Meta+" : ""}${
        e.shiftKey ? "Shift+" : ""
      }${e.key.toLowerCase()}`;

      const action = SHORTCUTS[key];
      if (action) {
        e.preventDefault();
        handleAIActionRef.current(action);
      }
    };

    const handleNoteAI = (e: Event) => {
      if (!aiEnabled) return;
      const detail = (e as CustomEvent<{ action?: string }>).detail;
      const action = detail?.action;
      if (!action || action === "edit") return;
      handleAIActionRef.current(action);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("note:ai", handleNoteAI as EventListener);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("note:ai", handleNoteAI as EventListener);
    };
  }, [loading, aiEnabled, setZenMode]);
}
