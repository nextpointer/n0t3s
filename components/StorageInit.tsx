"use client";

import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { autoSaveAtom, zenMode, loadPersistedSettings } from "@/store/noteAtom";
import { migrateFromLocalStorage } from "@/lib/storage";

export function StorageInit() {
  const setAutoSave = useSetAtom(autoSaveAtom);
  const setZenMode = useSetAtom(zenMode);

  useEffect(() => {
    migrateFromLocalStorage();
    loadPersistedSettings(setAutoSave, setZenMode);
  }, [setAutoSave, setZenMode]);

  return null;
}
