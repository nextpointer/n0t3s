"use client";

import { memo, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  navigationTargetAtom,
  savePromptDialogOpenAtom,
  discardEmptyNoteAtom,
  persistZenMode,
  persistToolbarEnabled,
} from "@/store/noteAtom";
import { SolarIcon } from "@/lib/icons";
import { ToolbarIcon } from "../icons/EditorIcons";

interface NoteActionsProps {
  save: (isAutoSave?: boolean) => void;
}

export const NoteActions = memo(function NoteActions({ save }: NoteActionsProps) {
  // zen mode state
  const [zen, setZenMode] = useAtom(zenMode);
  const [toolbarEnabled, setToolbarEnabled] = useAtom(toolbarEnabledAtom);
  const [viewMode, setViewMode] = useAtom(viewModeAtom);
  const router = useRouter();

  const handleToggleZen = useCallback(() => {
    const next = !zen;
    setZenMode(next);
    persistZenMode(next);
  }, [zen, setZenMode]);

  const previewing = viewMode === "preview";
  const handleTogglePreview = useCallback(() => {
    setViewMode(previewing ? "edit" : "preview");
  }, [previewing, setViewMode]);

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
  const setTarget = useSetAtom(navigationTargetAtom);
  const setShowPrompt = useSetAtom(savePromptDialogOpenAtom);
  const discardIfEmpty = useSetAtom(discardEmptyNoteAtom);
  const handleSave = useCallback(() => {
    save(false);
  }, [save]);

  // handler for opening ask dialog
  const handleOpenAskDialog = useCallback(() => {
    setAskDialogOpen(true);
  }, [setAskDialogOpen]);

  // The bottom bar's route to the note list. It mirrors the back arrow in
  // the header exactly — quiet discarded empties, a save prompt when a
  // manual-save note has edits — so leaving via either door can never lose
  // data differently. Keep the two in step if either changes.
  const handleOpenNoteList = useCallback(async () => {
    // A note the user never wrote anything in is dropped quietly.
    if (await discardIfEmpty()) {
      router.push("/");
      return;
    }
    if (unsaved && !autoSave) {
      setTarget("/");
      setShowPrompt(true);
    } else {
      router.push("/");
    }
  }, [unsaved, autoSave, router, setTarget, setShowPrompt, discardIfEmpty]);

  return (
    <div className="md:relative fixed right-3 bottom-3 md:bottom-0 md:right-8 left-0 flex flex-row h-16 pb-1 gap-2 md:gap-4 items-end md:items-center justify-end z-30 ">
      {!zen && (
        <button
          type="button"
          onClick={() => void handleOpenNoteList()}
          aria-label="Back to note list"
          title="All notes"
          className="cursor-pointer rounded-full p-3 md:mt-10 md:p-0.5"
        >
          <SolarIcon icon="notes" className="size-4 pointer-events-none text-foreground/70" />
        </button>
      )}

      {!zen && (
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Command palette"
          title="Search & commands (Ctrl+P)"
          className="cursor-pointer rounded-full p-3 md:mt-10 md:p-0.5"
        >
          <SolarIcon icon="search" className="size-4 pointer-events-none text-foreground/70" />
        </button>
      )}

      <button
        type="button"
        onClick={handleTogglePreview}
        aria-pressed={previewing}
        aria-label="Toggle read mode"
        title="Read mode (Ctrl+/)"
        className="cursor-pointer rounded-full p-3 md:mt-10 md:p-0.5"
      >
        <SolarIcon
          icon="read"
          className={cn(
            "size-4 pointer-events-none transition-colors",
            previewing ? "text-foreground" : "text-foreground/30",
          )}
        />
      </button>

      <button
        type="button"
        onClick={handleToggleToolbar}
        aria-pressed={toolbarEnabled}
        aria-label="Toggle formatting toolbar"
        title="Toggle formatting toolbar"
        className="cursor-pointer rounded-full p-3 md:mt-10 md:p-0.5"
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
          className="cursor-pointer rounded-full p-3 md:mt-10 md:p-0.5"
        >
          <SolarIcon icon="zenExit" className="size-4 pointer-events-none text-foreground/70" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleToggleZen}
          aria-label="Enter zen mode"
          title="Zen mode (Ctrl+Shift+Z)"
          className="cursor-pointer rounded-full p-3 md:mt-10 md:p-0.5"
        >
          <SolarIcon icon="zen" className="size-4 pointer-events-none" />
        </button>
      )}

      {!zen && aiEnabled && (
        <button
          type="button"
          onClick={handleOpenAskDialog}
          aria-label="Ask AI"
          title="Ask AI"
          className="cursor-pointer rounded-full p-3 md:mt-10 md:p-0.5"
        >
          <SolarIcon icon="ask" className="size-4 mr-1 text-foreground/50" />
        </button>
      )}

      {!zen && !autoSave && (
        <Button
          variant={unsaved ? "default" : "ghost"}
          className="text-xs sm:text-sm rounded-full py-0.1 md:mt-10"
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
