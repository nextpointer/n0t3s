"use client";

import { memo } from "react";
import { HistoryControls } from "./HistoryControls";
import { SettingsMenu } from "./SettingsMenu";

/**
 * The top bar is deliberately the smallest possible surface: undo, redo
 * and Settings. Everything else about a note hangs off the bottom bar —
 * leaving a note, searching, reading, zen, AI, help, config — so the
 * writing area keeps the top free of chrome.
 */
export const NoteHeader = memo(function NoteHeader() {
  return (
    <div className="fixed top-0 left-0 w-screen xl:w-5xl md:left-1/2 md:-translate-x-1/2 z-50 md:border-b-1 md:border-dashed flex justify-between items-center gap-2 p-2">
      <div />
      <div className="flex items-center gap-2">
        <HistoryControls />
        <SettingsMenu />
      </div>
    </div>
  );
});
