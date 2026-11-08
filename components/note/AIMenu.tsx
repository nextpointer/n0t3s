
"use client";

import { memo, useCallback, Fragment } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { SolarIcon, type IconId } from "@/lib/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  aiLoadingAtom,
  aiEnabledAtom,
  askDialogOpenAtom,
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
  // Free-form question over the note — the dialog that used to hang off
  // its own sparkle button in the bottom bar, folded in here so the bar
  // carries one AI entry instead of two.
  {
    id: "ask",
    label: "Ask AI",
    shortcut: "",
    icon: "ask",
  },
];

export const AIMenu = memo(function AIMenu({
  trigger = "menu",
}: {
  /** "menu" = the bar-styled ghost button (header, keyboard strip); "bar"
      = the round icon button the note-actions bar composes from. */
  trigger?: "menu" | "bar";
}) {
  const loading = useAtomValue(aiLoadingAtom);
  const aiEnabled = useAtomValue(aiEnabledAtom);
  const content = useAtomValue(contentAtom);
  const setContent = useSetAtom(contentAtom);
  const setAskOpen = useSetAtom(askDialogOpenAtom);
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

  const triggerEl =
    trigger === "bar" ? (
      <button
        type="button"
        aria-label="AI actions"
        title="AI actions"
        disabled={loading}
        className="cursor-pointer rounded-full p-2.5 md:mt-10 md:p-1 text-foreground/45 transition-colors hover:text-foreground/90 disabled:opacity-30"
      >
        <SolarIcon icon="ai" className="size-[15px] pointer-events-none" />
      </button>
    ) : (
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
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{triggerEl}</DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-38 md:w-68 shadow"
        align="end"
        side={trigger === "bar" ? "top" : "bottom"}
        sideOffset={10}
        collisionPadding={16}
      >
        {AI_ACTIONS.map(({ id, label, shortcut, icon }) => (
          <Fragment key={id}>
            {id === "ask" && <DropdownMenuSeparator className="my-1" />}
            <DropdownMenuItem
              onClick={() => (id === "ask" ? setAskOpen(true) : handleAction(id))}
              disabled={loading}
            >
              <SolarIcon icon={icon} className="w-4 h-4 mr-2" />
              {label}
              {shortcut && (
                <div className="hidden md:inline-block ml-auto px-2 py-1 bg-muted/60 rounded-full text-xs font-mono text-muted-foreground/80 border border-border/50 transition-all shrink-0">
                  {shortcut}
                </div>
              )}
            </DropdownMenuItem>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
