"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";
import { HistoryControls } from "./HistoryControls";
import { AIMenu } from "./AIMenu";
import { SettingsMenu } from "./SettingsMenu";
import {
  unsavedAtom,
  autoSaveAtom,
  savePromptDialogOpenAtom,
  navigationTargetAtom,
  search,
} from "@/store/noteAtom";
import { CommandMenu } from "../CommandMenu";
import { getNotes } from "@/lib/storage";
import { Note } from "@/lib/types";

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
    <div className="fixed top-0 left-0 w-screen xl:w-5xl md:left-1/2 md:-translate-x-1/2 z-50 md:border-b-1 md:border-dashed flex justify-between items-center gap-2 p-2">
      <div className="flex items-center gap-2  ">
        <Button variant="ghost" size="icon" onClick={handleNavigateBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        {/*{unsaved && (
          <span className="h-3 w-3 bg-primary/30 rounded-full animate-pulse" />
        )}*/}
      </div>

      <div className="flex items-center gap-2">
        <HistoryControls />
        <AIMenu />
        <SettingsMenu />
      </div>
    </div>
  );
});
