"use client";

import { memo, useCallback } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import {
  unsavedAtom,
  saveLoadingAtom,
  autoSaveAtom,
  aiEnabledAtom,
  askDialogOpenAtom,
  zenMode,
  search,
  toolbarEnabledAtom,
  viewModeAtom,
  persistZenMode,
  persistToolbarEnabled,
} from "@/store/noteAtom";
import { Cross } from "../icons/Cross";
import { Spark } from "../icons/Spark";
import { Zen } from "../icons/Zen";
import { Search } from "../icons/Search";
import { ToolbarIcon } from "../icons/EditorIcons";

interface NoteActionsProps {
  save: (isAutoSave?: boolean) => void;
}

export const NoteActions = memo(function NoteActions({ save }: NoteActionsProps) {
  // zen mode state
  const [zen, setZenMode] = useAtom(zenMode);
  const [toolbarEnabled, setToolbarEnabled] = useAtom(toolbarEnabledAtom);

  const handleToggleZen = useCallback(() => {
    const next = !zen;
    setZenMode(next);
    persistZenMode(next);
  }, [zen, setZenMode]);

  const handleToggleToolbar = useCallback(() => {
    const next = !toolbarEnabled;
    setToolbarEnabled(next);
    persistToolbarEnabled(next);
  }, [toolbarEnabled, setToolbarEnabled]);
  // getter
  const unsaved = useAtomValue(unsavedAtom);
  const loading = useAtomValue(saveLoadingAtom);
  const autoSave = useAtomValue(autoSaveAtom);
  const aiEnabled = useAtomValue(aiEnabledAtom);

  // setter
  const setAskDialogOpen = useSetAtom(askDialogOpenAtom);
  const setSearchOpen = useSetAtom(search);
  const handleSave = useCallback(() => {
    save(false);
  }, [save]);

  // handler for opening ask dialog
  const handleOpenAskDialog = useCallback(() => {
    setAskDialogOpen(true);
  }, [setAskDialogOpen]);

  return (
    <div className="md:relative fixed right-8 bottom-3 md:bottom-0 left-0 flex flex-row h-16 pb-1 gap-4 items-center justify-end z-30 ">
      {!zen && (
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Search notes"
          title="Search notes (Ctrl+P)"
          className="mt-10 cursor-pointer py-0.5 p-0.5 rounded-full"
        >
          <Search className="size-4 pointer-events-none text-foreground/70" />
        </button>
      )}

      <button
        type="button"
        onClick={handleToggleToolbar}
        aria-pressed={toolbarEnabled}
        aria-label="Toggle formatting toolbar"
        title="Toggle formatting toolbar"
        className="mt-10 cursor-pointer py-0.5 p-0.5 rounded-full"
      >
        <ToolbarIcon
          className={cn(
            "size-4 pointer-events-none transition-colors",
            toolbarEnabled
              ? "text-foreground"
              : "text-foreground/30",
          )}
        />
      </button>

      {zen ? (
        <button
          type="button"
          onClick={handleToggleZen}
          aria-label="Exit zen mode"
          title="Exit zen mode (Ctrl+Shift+Z)"
          className="mt-10 cursor-pointer py-0.5 p-0.5 rounded-full"
        >
          <Cross className="size-4 pointer-events-none text-foreground/70" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleToggleZen}
          aria-label="Enter zen mode"
          title="Zen mode (Ctrl+Shift+Z)"
          className="mt-10 cursor-pointer py-0.5 p-0.5 rounded-full"
        >
          <Zen className="size-4 pointer-events-none" />
        </button>
      )}

      {!zen && aiEnabled && (
        <button
          type="button"
          onClick={handleOpenAskDialog}
          aria-label="Ask AI"
          title="Ask AI"
          className="mt-10 cursor-pointer py-0.5 p-0.5 rounded-full"
        >
          <Spark className="size-4 mr-1 text-foreground/50" />
        </button>
      )}

      {!zen && !autoSave && (
        <Button
          variant={unsaved ? "default" : "ghost"}
          className="text-xs sm:text-sm rounded-full py-0.1 mt-10"
          onClick={handleSave}
          disabled={!unsaved || loading}
        >
          {loading ? (
            <>
              <Loader className="text-background mr-2" /> ...
            </>
          ) : (
            "Save"
          )}
        </Button>
      )}
    </div>
  );
});
