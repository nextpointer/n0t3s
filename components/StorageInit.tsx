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
  storageReadyAtom,
  loadPersistedSettings,
} from "@/store/noteAtom";
import { migrateFromLocalStorage, migrateTagsToInline } from "@/lib/storage";

export function StorageInit() {
  const setAutoSave = useSetAtom(autoSaveAtom);
  const setZenMode = useSetAtom(zenMode);
  const setToolbarEnabled = useSetAtom(toolbarEnabledAtom);
  const setAiEnabled = useSetAtom(aiEnabledAtom);
  const setPreviewColors = useSetAtom(previewColorsAtom);
  const setEditorFontSize = useSetAtom(editorFontSizeAtom);
  const setStorageReady = useSetAtom(storageReadyAtom);

  useEffect(() => {
    migrateFromLocalStorage();
    // Note/list loading waits for this: an editor that loads mid-migration
    // could autosave untouched (pre-seed) content over the rewritten record.
    migrateTagsToInline().finally(() => setStorageReady(true));
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
    setStorageReady,
  ]);

  return null;
}
