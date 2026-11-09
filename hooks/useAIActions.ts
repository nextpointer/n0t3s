import { useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import { aiEnabledAtom, aiLoadingAtom } from "@/store/noteAtom";
import toast from "react-hot-toast";
import { AIAction } from "@/lib/types";

export function UseAIActions() {
  const setAiLoading = useSetAtom(aiLoadingAtom);
  const aiEnabled = useAtomValue(aiEnabledAtom);

  const executeAction = useCallback(
    async (
      action: AIAction,
      content: string,
      instruction?: string,
    ): Promise<string | null> => {
      if (!aiEnabled) {
        toast.error("AI is turned off in Settings");
        return null;
      }
      if (!content?.trim()) {
        const msg = "Not able to edit";
        if (action !== "edit") toast.error(msg);
        return null;
      }
      setAiLoading(true);
      try {
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, action, instruction }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error || "AI request failed");
        }

        const result = typeof data?.result === "string" ? data.result : null;
        if (!result) throw new Error("AI request failed");

        // Dialog-driven flows (edit) manage their own UI/feedback.
        if (action !== "edit") {
          if (result !== content.trim()) toast.success("Done", { duration: 1400 });
          else toast("No changes", { icon: "·", duration: 1200 });
        }

        return result;
        /* eslint-disable @typescript-eslint/no-explicit-any */
      } catch (error: any) {
        console.error("AI Error:", error);
        toast.error(error?.message || "Couldn't complete that. Try again.");
        return null;
      } finally {
        setAiLoading(false);
      }
    },
    [setAiLoading, aiEnabled],
  );

  return { executeAction };
}
