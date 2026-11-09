"use client";

import { memo, useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { SolarIcon, type IconId } from "@/lib/icons";
import { cn } from "@/lib/utils";
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
  editAIDialogOpenAtom,
  editAISelectionAtom,
  contentAtom,
  checkUnsavedAtom,
} from "@/store/noteAtom";
import { UseAIActions } from "@/hooks/useAIActions";
import { getNoteEditor } from "@/lib/editor-registry";
import { captureEditorSelection, applyToSelection } from "@/lib/ai-selection";
import toast from "react-hot-toast";

const AI_ACTIONS: {
  id: string;
  label: string;
  shortcut: string;
  icon: IconId;
}[] = [
  { id: "summarize", label: "Summarize", shortcut: "ctrl+shift+s", icon: "summarize" },
  { id: "rewrite", label: "Rewrite", shortcut: "ctrl+shift+r", icon: "rewrite" },
  { id: "grammar", label: "Fix Grammar", shortcut: "ctrl+shift+g", icon: "grammar" },
  { id: "expand", label: "Expand", shortcut: "ctrl+shift+e", icon: "expand" },
  { id: "simplify", label: "Simplify", shortcut: "ctrl+shift+i", icon: "simplify" },
  { id: "todo", label: "Todo", shortcut: "ctrl+shift+q", icon: "todo" },
  { id: "edit", label: "Edit with AI", shortcut: "", icon: "ai" },
];

export const AIMenu = memo(function AIMenu({
  trigger = "menu",
  className,
  iconClassName,
}: {
  /** "menu" = the bar-styled ghost button (header, keyboard strip); "bar"
      = the round icon button the note-actions bar composes from. */
  trigger?: "menu" | "bar";
  className?: string;
  iconClassName?: string;
}) {
  const loading = useAtomValue(aiLoadingAtom);
  const aiEnabled = useAtomValue(aiEnabledAtom);
  const content = useAtomValue(contentAtom);
  const setContent = useSetAtom(contentAtom);
  const setEditAIOpen = useSetAtom(editAIDialogOpenAtom);
  const setEditAISelection = useSetAtom(editAISelectionAtom);
  const checkUnsaved = useSetAtom(checkUnsavedAtom);
  const { executeAction } = UseAIActions();

  const handleAction = useCallback(
    async (action: string) => {
      const sel = captureEditorSelection();
      const target = sel ? sel.text : content;
      if (!target.trim()) {
        toast.error("Not able to edit");
        return;
      }
      // Restore visible selection while the action runs.
      const ta = getNoteEditor()?.textarea;
      if (sel && ta) {
        try {
          ta.focus({ preventScroll: true });
          ta.setSelectionRange(sel.start, sel.end);
        } catch {}
      }

      /* eslint-disable @typescript-eslint/no-explicit-any */
      const result = await executeAction(action as any, target);
      if (result) {
        setContent(sel ? applyToSelection(sel, result) : result);
        checkUnsaved();
      }
    },
    [content, executeAction, setContent, checkUnsaved],
  );

  const openEditAI = useCallback(() => {
    const sel = captureEditorSelection();
    setEditAISelection(sel);
    // Keep selection visible by restoring focus/selection to the editor.
    const ta = getNoteEditor()?.textarea;
    if (sel && ta) {
      try {
        ta.focus({ preventScroll: true });
        ta.setSelectionRange(sel.start, sel.end);
      } catch {}
    }
    setEditAIOpen(true);
  }, [setEditAIOpen, setEditAISelection]);

  if (!aiEnabled) return null;

  const triggerEl =
    trigger === "bar" ? (
      <button
        type="button"
        aria-label="AI actions"
        title="AI actions"
        disabled={loading}
        className={cn(
          "cursor-pointer rounded-full p-2.5 md:mt-10 md:p-1 text-foreground/45 transition-colors hover:text-foreground/90 disabled:opacity-30",
          className,
        )}
      >
        <SolarIcon icon="ai" className={cn("size-[15px] pointer-events-none", iconClassName)} />
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
          <div key={id}>
            {id === "edit" && <DropdownMenuSeparator className="my-1" />}
            <DropdownMenuItem
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => (id === "edit" ? openEditAI() : handleAction(id))}
              disabled={loading}
            >
              <SolarIcon icon={icon} className="mr-2 h-4 w-4" />
              {label}
              {shortcut && (
                <div className="ml-auto hidden shrink-0 rounded-full border border-border/50 bg-muted/60 px-2 py-1 font-mono text-xs text-muted-foreground/80 transition-all md:inline-block">
                  {shortcut}
                </div>
              )}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
