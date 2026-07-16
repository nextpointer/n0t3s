"use client";

import { memo, useCallback } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import {
  unsavedAtom,
  saveLoadingAtom,
  autoSaveAtom,
  askDialogOpenAtom,
  zenMode,
  search,
} from "@/store/noteAtom";
import { Cross } from "../icons/Cross";
import { Spark } from "../icons/Spark";
import { Zen } from "../icons/Zen";
import { Search } from "../icons/Search";

interface NoteActionsProps {
  save: (isAutoSave?: boolean) => void;
}

export const NoteActions = memo(function NoteActions({ save }: NoteActionsProps) {
  // zen mode state
  const [zen, setZenMode] = useAtom(zenMode);
  // getter
  const unsaved = useAtomValue(unsavedAtom);
  const loading = useAtomValue(saveLoadingAtom);
  const autoSave = useAtomValue(autoSaveAtom);

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
          className="mt-10 cursor-pointer py-0.5 p-0.5 rounded-full"
        >
          <Search className="size-4 pointer-events-none text-foreground/70" />
        </button>
      )}

      {zen ? (
        <button
          type="button"
          onClick={() => setZenMode((prev) => !prev)}
          className="mt-10 cursor-pointer py-0.5 p-0.5 rounded-full"
        >
          <Cross className="size-4 pointer-events-none text-foreground/70" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setZenMode((prev) => !prev)}
          className="mt-10 cursor-pointer py-0.5 p-0.5 rounded-full"
        >
          <Zen className="size-4 pointer-events-none" />
        </button>
      )}

      {!zen && (
        <button
          type="button"
          onClick={handleOpenAskDialog}
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
