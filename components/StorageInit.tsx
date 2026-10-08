"use client";

import { useEffect } from "react";
import { useSetAtom } from "jotai";
import {
  autoSaveAtom,
  zenMode,
  toolbarEnabledAtom,
  aiEnabledAtom,
  previewColorsAtom,
  editorFontSizeAtom,
  loadPersistedSettings,
} from "@/store/noteAtom";
import { migrateFromLocalStorage } from "@/lib/storage";

export function StorageInit() {
  const setAutoSave = useSetAtom(autoSaveAtom);
  const setZenMode = useSetAtom(zenMode);
  const setToolbarEnabled = useSetAtom(toolbarEnabledAtom);
  const setAiEnabled = useSetAtom(aiEnabledAtom);
  const setPreviewColors = useSetAtom(previewColorsAtom);
  const setEditorFontSize = useSetAtom(editorFontSizeAtom);

  useEffect(() => {
    migrateFromLocalStorage();
    loadPersistedSettings(
      setAutoSave,
      setZenMode,
      setToolbarEnabled,
      setAiEnabled,
      setPreviewColors,
      setEditorFontSize,
    );
  }, [
    setAutoSave,
    setZenMode,
    setToolbarEnabled,
    setAiEnabled,
    setPreviewColors,
    setEditorFontSize,
  ]);

  return null;
}
