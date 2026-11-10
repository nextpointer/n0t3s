import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, createElement } from "react";
import { aiEnabledAtom, aiLoadingAtom } from "@/store/noteAtom";
import toast from "react-hot-toast";
import { AIAction } from "@/lib/types";
import { MAX_AI_SELECTION_CHARS } from "@/lib/limits";

function showProcessingToast(onCancel: () => void): string {
  return toast.custom(
    (t) =>
      createElement(
        "div",
        {
          className: `${t.visible ? "animate-enter" : "animate-leave"} pointer-events-auto flex items-center gap-3 rounded-full border border-border/60 bg-background/95 px-3.5 py-2 text-[13px] shadow-lg backdrop-blur`,
        },
        createElement(
          "span",
          { className: "inline-block size-3.5 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground/70" },
        ),
        createElement("span", { className: "text-foreground/80" }, "AI working…"),
        createElement(
          "button",
          {
            type: "button",
            onClick: () => {
              onCancel();
              toast.dismiss(t.id);
            },
            className: "ml-1 rounded-full px-2 py-0.5 text-[11px] text-muted-foreground/70 transition-colors hover:bg-foreground/[0.06] hover:text-foreground",
          },
          "Cancel",
        ),
      ),
    { duration: Infinity },
  );
}

export function UseAIActions() {
  const setAiLoading = useSetAtom(aiLoadingAtom);
  const aiEnabled = useAtomValue(aiEnabledAtom);

  const executeAction = useCallback(
    async (
      action: AIAction,
      content: string,
      instruction?: string,
      options?: { noteContext?: string },
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
      if (content.length > MAX_AI_SELECTION_CHARS) {
        toast.error("too large note");
        return null;
      }
      const controller = new AbortController();
      setAiLoading(true);
      const toastId = showProcessingToast(() => controller.abort());
      try {
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, action, instruction, noteContext: options?.noteContext }),
          signal: controller.signal,
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error || "AI request failed");
        }

        const result = typeof data?.result === "string" ? data.result : null;
        if (!result) throw new Error("AI request failed");

        toast.dismiss(toastId);
        // Dialog-driven flows (edit) manage their own UI/feedback.
        if (action !== "edit") {
          if (result !== content.trim()) toast.success("Done", { duration: 1400 });
          else toast("No changes", { icon: "·", duration: 1200 });
        }

        return result;
        /* eslint-disable @typescript-eslint/no-explicit-any */
      } catch (error: any) {
        toast.dismiss(toastId);
        if (error?.name === "AbortError" || controller.signal.aborted) {
          toast("Cancelled", { icon: "·", duration: 1200 });
          return null;
        }
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
