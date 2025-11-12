"use client";

import { memo, useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import {
  WandSparkles,
  FileText,
  PenLine,
  SpellCheck2,
  Maximize2,
  BookOpenCheck,
  ListTodo,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  aiLoadingAtom,
  contentAtom,
  addToHistoryAtom,
  checkUnsavedAtom,
} from "@/store/noteAtom";
import { useAIActions } from "@/hooks/useAIActions";
import toast from "react-hot-toast";
import { Prompt } from "../icons/Prompt";

const AI_ACTIONS = [
  { id: "summarize", label: "Summarize", icon: FileText },
  { id: "rewrite", label: "Rewrite", icon: PenLine },
  { id: "grammar", label: "Fix Grammar", icon: SpellCheck2 },
  { id: "expand", label: "Expand", icon: Maximize2 },
  { id: "simplify", label: "Simplify", icon: BookOpenCheck },
  { id: "todo", label: "Todo", icon: ListTodo },
  { id: "prompt", label: "Prompt", icon: Prompt },
] as const;

export const AIMenu = memo(function AIMenu() {
  const loading = useAtomValue(aiLoadingAtom);
  const content = useAtomValue(contentAtom);
  const setContent = useSetAtom(contentAtom);
  const addToHistory = useSetAtom(addToHistoryAtom);
  const checkUnsaved = useSetAtom(checkUnsavedAtom);
  const { executeAction } = useAIActions();

  // hnadler for execute AI actions
  const handleAction = useCallback(
    async (action: string) => {
      if (!content.trim()) {
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 pr-2"
          disabled={loading}
        >
          {loading ? (
            <Loader className="w-4 h-4" />
          ) : (
            <WandSparkles className="w-4 h-4 text-yellow-500" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-36 shadow"
        align="end"
        side="bottom"
        collisionPadding={16}
      >
        {AI_ACTIONS.map(({ id, label, icon: Icon }) => (
          <DropdownMenuItem
            key={id}
            onClick={() => handleAction(id)}
            disabled={loading}
          >
            <Icon className="w-4 h-4 mr-2" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
