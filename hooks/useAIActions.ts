import { useSetAtom } from "jotai";
import { useCallback } from "react";
import { aiLoadingAtom } from "@/store/noteAtom";
import toast from "react-hot-toast";
import { AIAction } from "@/lib/types";

export function UseAIActions() {
  const setAiLoading = useSetAtom(aiLoadingAtom);

  // handler for execute the action and get response
  const executeAction = useCallback(
    async (
      action: AIAction,
      content: string,
      question?: string,
    ): Promise<string | null> => {
      setAiLoading(true);
      try {
        // Make API request
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content:
              action === "ask"
                ? `${content}\n\nQuestion: ${question}`
                : content,
            action: action === "ask" ? "ask" : action,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "AI request failed");
        }

        const { result } = await response.json();

        if (action !== "ask") {
          toast.success(`AI ${action} applied successfully`);
        }

        return result;
        /* eslint-disable @typescript-eslint/no-explicit-any */
      } catch (error: any) {
        console.error("AI Error:", error);
        toast.error(error.message || "Failed to process AI action");
        return null;
      } finally {
        setAiLoading(false);
      }
    },
    [setAiLoading],
  );

  return { executeAction };
}
