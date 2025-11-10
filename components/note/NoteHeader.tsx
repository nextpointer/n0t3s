"use client";

import { memo, useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { HistoryControls } from "./HistoryControls";
import { AIMenu } from "./AIMenu";
import { SettingsMenu } from "./SettingsMenu";
import {
  unsavedAtom,
  autoSaveAtom,
  savePromptDialogOpenAtom,
  navigationTargetAtom,
} from "@/store/noteAtom";

export const NoteHeader = memo(function NoteHeader() {
  //getter
  const unsaved = useAtomValue(unsavedAtom);
  const autoSave = useAtomValue(autoSaveAtom);
  const setShowPrompt = useSetAtom(savePromptDialogOpenAtom);
  // setter
  const setTarget = useSetAtom(navigationTargetAtom);
  const router = useRouter();

  // hander for back navigation
  const handleNavigateBack = useCallback(() => {
    if (unsaved && !autoSave) {
      setTarget("/");
      setShowPrompt(true);
    } else {
      router.push("/");
    }
  }, [unsaved, autoSave, router, setTarget, setShowPrompt]);

  return (
    <div className="flex justify-between items-center gap-2">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={handleNavigateBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        {unsaved && (
          <span className="h-3 w-3 bg-red-300 rounded-full animate-pulse" />
        )}
      </div>

      <div className="flex items-center gap-2">
        <HistoryControls />
        <AIMenu />
        <SettingsMenu />
      </div>
    </div>
  );
});
