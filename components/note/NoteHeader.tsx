"use client";

import { memo, useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import { HistoryControls } from "./HistoryControls";
import { SettingsMenu } from "./SettingsMenu";
import { SolarIcon } from "@/lib/icons";
import {
  unsavedAtom,
  autoSaveAtom,
  savePromptDialogOpenAtom,
  navigationTargetAtom,
  discardEmptyNoteAtom,
} from "@/store/noteAtom";

/**
 * Top bar: a back arrow on the left, undo/redo and Settings on the right.
 * The arrow runs the same safe-exit path as the bottom bar's notes button
 * (quiet-drop empty drafts, prompt on unsaved manual edits) so leaving a
 * note never loses work regardless of which control is used.
 */
export const NoteHeader = memo(function NoteHeader() {
  const unsaved = useAtomValue(unsavedAtom);
  const autoSave = useAtomValue(autoSaveAtom);
  const setShowPrompt = useSetAtom(savePromptDialogOpenAtom);
  const setTarget = useSetAtom(navigationTargetAtom);
  const discardIfEmpty = useSetAtom(discardEmptyNoteAtom);
  const router = useRouter();

  const handleBack = useCallback(async () => {
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
    <div className="fixed top-0 left-0 w-screen xl:w-5xl md:left-1/2 md:-translate-x-1/2 z-50 md:border-b-1 md:border-dashed flex justify-between items-center gap-2 p-2">
      <button
        type="button"
        onClick={() => void handleBack()}
        aria-label="Back to notes"
        title="All notes"
        className="rounded-md p-1.5 text-foreground/45 transition-colors hover:text-foreground/90"
      >
        <SolarIcon icon="back" className="size-[15px]" />
      </button>
      <div className="flex items-center gap-2">
        <HistoryControls />
        <SettingsMenu />
      </div>
    </div>
  );
});
