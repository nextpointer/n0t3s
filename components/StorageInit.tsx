"use client";

import { useEffect } from "react";
import { useSetAtom } from "jotai";
import {
  autoSaveAtom,
  zenMode,
  toolbarEnabledAtom,
  aiEnabledAtom,
  loadPersistedSettings,
} from "@/store/noteAtom";
import { migrateFromLocalStorage } from "@/lib/storage";

export function StorageInit() {
  const setAutoSave = useSetAtom(autoSaveAtom);
  const setZenMode = useSetAtom(zenMode);
  const setToolbarEnabled = useSetAtom(toolbarEnabledAtom);
  const setAiEnabled = useSetAtom(aiEnabledAtom);

  useEffect(() => {
    migrateFromLocalStorage();
    loadPersistedSettings(
      setAutoSave,
      setZenMode,
      setToolbarEnabled,
      setAiEnabled,
    );
  }, [setAutoSave, setZenMode, setToolbarEnabled, setAiEnabled]);

  return null;
}
