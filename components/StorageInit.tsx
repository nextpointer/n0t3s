"use client";

import { useEffect } from "react";
import { useSetAtom } from "jotai";
import {
  autoSaveAtom,
  zenMode,
  toolbarEnabledAtom,
  loadPersistedSettings,
} from "@/store/noteAtom";
import { migrateFromLocalStorage } from "@/lib/storage";

export function StorageInit() {
  const setAutoSave = useSetAtom(autoSaveAtom);
  const setZenMode = useSetAtom(zenMode);
  const setToolbarEnabled = useSetAtom(toolbarEnabledAtom);

  useEffect(() => {
    migrateFromLocalStorage();
    loadPersistedSettings(setAutoSave, setZenMode, setToolbarEnabled);
  }, [setAutoSave, setZenMode, setToolbarEnabled]);

  return null;
}
