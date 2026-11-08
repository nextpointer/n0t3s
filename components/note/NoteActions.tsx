"use client";

import { memo, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import {
  unsavedAtom,
  saveLoadingAtom,
  autoSaveAtom,
  zenMode,
  search,
  viewModeAtom,
  persistZenMode,
  contentAtom,
} from "@/store/noteAtom";
import { SolarIcon } from "@/lib/icons";
import { AIMenu } from "./AIMenu";
import { ConfigMenu } from "./ConfigMenu";

interface NoteActionsProps {
  save: (isAutoSave?: boolean) => void;
}

export const NoteActions = memo(function NoteActions({ save }: NoteActionsProps) {
  const [zen, setZenMode] = useAtom(zenMode);
  const [viewMode, setViewMode] = useAtom(viewModeAtom);
  const router = useRouter();

  const handleToggleZen = useCallback(() => {
    const next = !zen;
    setZenMode(next);
    persistZenMode(next);
  }, [zen, setZenMode]);

  const previewing = viewMode === "preview";
  const handleTogglePreview = useCallback(() => {
    setViewMode(previewing ? "edit" : "preview");
  }, [previewing, setViewMode]);

  const unsaved = useAtomValue(unsavedAtom);
  const loading = useAtomValue(saveLoadingAtom);
  const autoSave = useAtomValue(autoSaveAtom);
  const setSearchOpen = useSetAtom(search);
  const content = useAtomValue(contentAtom);

  const stats = useMemo(() => {
    const t = content || "";
    const words = t.trim() ? t.trim().split(/\s+/).length : 0;
    return { words, chars: t.length };
  }, [content]);

  const handleSave = useCallback(() => {
    save(false);
  }, [save]);

  return (
    <div className="md:relative fixed inset-x-0 bottom-0 md:inset-x-auto md:right-8 md:left-0 flex flex-row h-14 md:h-auto pb-[max(0.5rem,env(safe-area-inset-bottom))] md:pb-1 gap-1 md:gap-3 items-center justify-evenly md:justify-between bg-background/95 backdrop-blur md:bg-transparent md:backdrop-blur-none border-t border-border/40 md:border-0 z-30">
      {/* Desktop: word/char counter aligned with the bottom icons. Hidden on phone. */}
      <div
        className="note-stats pointer-events-none hidden md:flex items-center gap-2 text-[10px] tracking-[0.18em] text-foreground/35 md:pb-1"
        style={{ fontFamily: "'Jetbrains Mono', 'Space Mono', monospace" }}
        aria-label={`${stats.words} words, ${stats.chars} characters`}
      >
        <span>{stats.words}w</span>
        <span aria-hidden className="text-foreground/20">·</span>
        <span>{stats.chars}c</span>
      </div>
      <div className="flex flex-row items-center justify-evenly md:justify-end gap-1 md:gap-3 w-full md:w-auto">
      {!zen && (
        <button
          type="button"
          onClick={() => setSearchOpen("notes")}
          aria-label="Open notes list"
          title="Notes (Ctrl+O)"
          className="cursor-pointer rounded-full p-2.5 md:mt-10 md:p-1 text-foreground/45 transition-colors hover:text-foreground/90"
        >
          <SolarIcon icon="notes" className="size-[15px] pointer-events-none" />
        </button>
      )}

      {!zen && (
        <button
          type="button"
          onClick={() => setSearchOpen("commands")}
          aria-label="Command palette"
          title="Commands (Ctrl+P)"
          className="cursor-pointer rounded-full p-2.5 md:mt-10 md:p-1 text-foreground/45 transition-colors hover:text-foreground/90"
        >
          <SolarIcon icon="search" className="size-[15px] pointer-events-none" />
        </button>
      )}

      <button
        type="button"
        onClick={handleTogglePreview}
        aria-pressed={previewing}
        aria-label="Toggle read mode"
        title="Read mode (Ctrl+/)"
        className={cn(
          "cursor-pointer rounded-full p-2.5 md:mt-10 md:p-1 transition-colors",
          previewing ? "text-foreground/90" : "text-foreground/45 hover:text-foreground/90",
        )}
      >
        <SolarIcon icon="read" className="size-[15px] pointer-events-none" />
      </button>

      {zen ? (
        <button
          type="button"
          onClick={handleToggleZen}
          aria-label="Exit zen mode"
          title="Exit zen mode (Ctrl+Shift+Z)"
          className="cursor-pointer rounded-full p-2.5 md:mt-10 md:p-1 text-foreground/45 transition-colors hover:text-foreground/90"
        >
          <SolarIcon icon="zenExit" className="size-[15px] pointer-events-none" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleToggleZen}
          aria-label="Enter zen mode"
          title="Zen mode (Ctrl+Shift+Z)"
          className="cursor-pointer rounded-full p-2.5 md:mt-10 md:p-1 text-foreground/45 transition-colors hover:text-foreground/90"
        >
          <SolarIcon icon="zen" className="size-[15px] pointer-events-none" />
        </button>
      )}

      {/* leaving a note · finding · reading · focus · assist · prefs · save */}
      {!zen && <AIMenu trigger="bar" />}

      {!zen && (
        <button
          type="button"
          onClick={() => router.push("/help")}
          aria-label="Help and shortcuts"
          title="Help & shortcuts (?)"
          className="cursor-pointer rounded-full p-2.5 md:mt-10 md:p-1 text-foreground/45 transition-colors hover:text-foreground/90"
        >
          <SolarIcon icon="help" className="size-[15px] pointer-events-none" />
        </button>
      )}

      {!zen && <ConfigMenu />}

      {!zen && !autoSave && (
        <Button
          variant={unsaved ? "default" : "ghost"}
          className="text-xs sm:text-sm rounded-full h-8 px-3 md:mt-10"
          onClick={handleSave}
          disabled={!unsaved || loading}
        >
          {loading ? (
            <>
              <Loader className="text-background mr-2" /> ...
            </>
          ) : (
            "Save"
          )}
        </Button>
      )}
      </div>
    </div>
  );
});
