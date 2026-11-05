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
      if (!content?.trim()) {
        toast.error("Note content is empty");
        return;
      }
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const result = await executeAction(action as any, content);
      if (result) {
        setContent(result);
        checkUnsaved();
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
      "Control+Shift+i": "simplify",
      "Control+Shift+q": "todo",
      "Control+Shift+p": "prompt",
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
        // Don't preventDefault for Ctrl+Shift+I (browser DevTools)
        if (key !== "Control+Shift+i" && key !== "Meta+Shift+i") {
          e.preventDefault();
        }
        handleAIActionRef.current(action);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, aiEnabled, setZenMode]);
}
