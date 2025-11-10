"use client";

import { memo, useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { Sparkles } from "lucide-react";
import {
  unsavedAtom,
  saveLoadingAtom,
  autoSaveAtom,
  askDialogOpenAtom,
} from "@/store/noteAtom";
import { useNoteOperations } from "@/hooks/useNoteOperations";

export const NoteActions = memo(function NoteActions() {
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
    <div className="flex flex-row h-12 pb-1 gap-0 mt-10 items-center relative">
      <Button
        onClick={handleOpenAskDialog}
        className="absolute left-0 h-full min-w-[100px] px-2 text-xs sm:text-sm"
        style={{
          borderRadius: 0,
          clipPath:
            "path('M100 6.83375C100 8.49902 99.3404 10.0754 98.4528 11.4843C96.8991 13.9503 96 16.8701 96 20C96 23.1296 96.8992 26.0488 98.4527 28.5145C99.3404 29.9236 100 31.5 100 33.1654V33.1654C100 36.9401 96.9401 40 93.1654 40H20C8.9543 40 0 31.0457 0 20V20C0 8.95431 8.95431 0 20 0H93.1662C96.9404 0 100 3.05957 100 6.83375V6.83375Z')",
        }}
      >
        <Sparkles className="w-4 h-4 mr-1" />
        Ask
      </Button>
      <Button
        className="min-h-[calc(100%-5px)] min-w-[calc(100%-100px)] text-xs sm:text-sm rounded-full ml-auto"
        onClick={handleSave}
        disabled={!unsaved || loading}
      >
        {loading ? (
          <>
            <Loader className="text-background mr-2" /> Saving...
          </>
        ) : autoSave ? (
          "Auto Save On"
        ) : (
          "Save"
        )}
      </Button>
    </div>
  );
});
