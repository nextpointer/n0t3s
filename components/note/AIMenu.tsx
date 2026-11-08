"use client";

import { memo, useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { SolarIcon, type IconId } from "@/lib/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  aiLoadingAtom,
  aiEnabledAtom,
  contentAtom,
  checkUnsavedAtom,
} from "@/store/noteAtom";
import { UseAIActions } from "@/hooks/useAIActions";
import toast from "react-hot-toast";

const AI_ACTIONS: {
  id: string;
  label: string;
  shortcut: string;
  icon: IconId;
}[] = [
  {
    id: "summarize",
    label: "Summarize",
    shortcut: "ctrl+shift+s",
    icon: "summarize",
  },
  { id: "rewrite", label: "Rewrite", shortcut: "ctrl+shift+r", icon: "rewrite" },
  {
    id: "grammar",
    label: "Fix Grammar",
    shortcut: "ctrl+shift+g",
    icon: "grammar",
  },
  { id: "expand", label: "Expand", shortcut: "ctrl+shift+e", icon: "expand" },
  {
    id: "simplify",
    label: "Simplify",
    shortcut: "ctrl+shift+i",
    icon: "simplify",
  },
  { id: "todo", label: "Todo", shortcut: "ctrl+shift+q", icon: "todo" },
  {
    id: "prompt",
    label: "/ [ Prompt ]",
    shortcut: "ctrl+shift+p",
    icon: "prompt",
  },
];

export const AIMenu = memo(function AIMenu() {
  const loading = useAtomValue(aiLoadingAtom);
  const aiEnabled = useAtomValue(aiEnabledAtom);
  const content = useAtomValue(contentAtom);
  const setContent = useSetAtom(contentAtom);
  const checkUnsaved = useSetAtom(checkUnsavedAtom);
  const { executeAction } = UseAIActions();

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
        checkUnsaved();
      }
    },
    [content, executeAction, setContent, checkUnsaved],
  );

  if (!aiEnabled) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 pr-2"
          disabled={loading}
          aria-label="AI actions"
          title="AI actions"
        >
          {loading ? (
            <Loader className="w-4 h-4" />
          ) : (
            <SolarIcon icon="ai" className="w-4 h-4 text-yellow-500" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-38 md:w-68 shadow"
        align="end"
        side="bottom"
        collisionPadding={16}
      >
        {AI_ACTIONS.map(({ id, label, shortcut, icon }) => (
          <DropdownMenuItem
            key={id}
            onClick={() => handleAction(id)}
            disabled={loading}
          >
            <SolarIcon icon={icon} className="w-4 h-4 mr-2" />
            {label}
            <div className="hidden md:inline-block ml-auto px-2 py-1 bg-muted/60 rounded-full text-xs font-mono text-muted-foreground/80 border border-border/50 transition-all shrink-0">
              {shortcut}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
