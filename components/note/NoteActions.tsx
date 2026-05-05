"use client";

import { memo, useCallback } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { Sparkles } from "lucide-react";
import {
  unsavedAtom,
  saveLoadingAtom,
  autoSaveAtom,
  askDialogOpenAtom,
  zenMode,
} from "@/store/noteAtom";
import { useNoteOperations } from "@/hooks/useNoteOperations";
import { Cross } from "../icons/Cross";
import { Saved } from "../icons/Saved";
import { Spark } from "../icons/Spark";

export const NoteActions = memo(function NoteActions() {
  // zen mode state
  const [zen, setZenMode] = useAtom(zenMode);
  // getter
  const unsaved = useAtomValue(unsavedAtom);
  const loading = useAtomValue(saveLoadingAtom);
  const autoSave = useAtomValue(autoSaveAtom);

  // setter
  const setAskDialogOpen = useSetAtom(askDialogOpenAtom);

  const { save } = useNoteOperations();
  const handleSave = useCallback(() => {
    save(false);
  }, [save]);

  // handler for opening ask dialog
  const handleOpenAskDialog = useCallback(() => {
    setAskDialogOpen(true);
  }, [setAskDialogOpen]);

  return (
    <div className="relative flex flex-row h-16 pb-1 gap-2 items-center justify-end z-50">
      {zen && (
        <button
          onClick={() => setZenMode((prev) => !prev)}
          className="mt-10 cursor-pointer bg-foreground/20 py-0.5 p-0.5 rounded-full"
        >
          <Cross className="size-4 pointer-events-none" />
        </button>
      )}
      <Button
        onClick={handleOpenAskDialog}
        className="h-none text-xs sm:text-sm flex justify-center items-center mt-10"
        variant={"ghost"}
      >
        <Spark className="size-4 mr-1 text-foreground/50" />
      </Button>
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
        ) : autoSave ? (
          <Saved className="size-4 text-foreground/30" />
        ) : (
          "Save"
        )}
      </Button>
    </div>
  );
});
