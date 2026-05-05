import { useEffect, useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  contentAtom,
  aiLoadingAtom,
  addToHistoryAtom,
  checkUnsavedAtom,
} from "@/store/noteAtom";
import { UseAIActions } from "@/hooks/useAIActions";
import toast from "react-hot-toast";

export function UseAIShortcuts() {
  const content = useAtomValue(contentAtom);
  const loading = useAtomValue(aiLoadingAtom);
  const setContent = useSetAtom(contentAtom);
  const addToHistory = useSetAtom(addToHistoryAtom);
  const checkUnsaved = useSetAtom(checkUnsavedAtom);
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
        addToHistory(result);
        checkUnsaved();
      }
    },
    [content, executeAction, setContent, addToHistory, checkUnsaved],
  );

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
      const key = `${e.ctrlKey ? "Control+" : ""}${e.metaKey ? "Meta+" : ""}${
        e.shiftKey ? "Shift+" : ""
      }${e.key.toLowerCase()}`;

      const action = SHORTCUTS[key];
      if (action) {
        e.preventDefault();
        handleAIAction(action);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleAIAction, loading]);
}
