"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSetAtom, useAtomValue, useAtom } from "jotai";
import { Loader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { NoteHeader } from "@/components/note/NoteHeader";
import { NoteTitle } from "@/components/note/NoteTitle";
import { NoteContent } from "@/components/note/NoteContent";
import { NoteActions } from "@/components/note/NoteActions";
import { EditWithAIDialog } from "@/components/dialogs/EditWithAIDialog";
import { DeleteDialog } from "@/components/dialogs/DeleteDialog";
import { SavePromptDialog } from "@/components/dialogs/SavePromptDialog";
import {
  pageLoadingAtom,
  allTagsAtom,
  initializeNoteAtom,
  discardEmptyNoteAtom,
  storageReadyAtom,
  zenMode,
  search,
} from "@/store/noteAtom";
import { getNotes } from "@/lib/storage";
import { getNoteTags } from "@/lib/tag-syntax";
import { useNoteOperations } from "@/hooks/useNoteOperations";
import { Note } from "@/lib/types";
import { ExportDialog } from "@/components/dialogs/ExportDialog";
import { UseAIShortcuts } from "@/hooks/useAIshortcuts";
import { CommandMenu } from "@/components/CommandMenu";
import { isNoteTooLarge, MAX_NOTE_CHARS, formatCharLimit } from "@/lib/limits";

export default function Page() {
  // Get note ID from URL
  const params = useParams<{ slug: string }>();
  const id = params.slug;
  const router = useRouter();

  /**
   * Local state to hold loaded note
   * CRITICAL: This prevents race conditions by ensuring
   * component doesn't render until note is fully loaded
   */
  const [loadedNote, setLoadedNote] = useState<Note | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [searchOpen, setSearchOpen] = useAtom(search);
  const [notes, setNotes] = useState<Note[]>([]);
  const zen = useAtomValue(zenMode);
  const editorScrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollMask, setScrollMask] = useState({ top: false, bottom: false });

  // Read-only atoms
  const pageLoading = useAtomValue(pageLoadingAtom);
  const storageReady = useAtomValue(storageReadyAtom);

  // setters
  const setPageLoading = useSetAtom(pageLoadingAtom);
  const setAllTags = useSetAtom(allTagsAtom);
  const initializeNote = useSetAtom(initializeNoteAtom);
  const discardIfEmpty = useSetAtom(discardEmptyNoteAtom);

  // Initialize auto-save functionality
  const { save } = useNoteOperations();
  UseAIShortcuts();

  // The command palette's Save runs this event instead of importing the
  // hook again — route it to the real save so the ⌘S entry isn't a no-op.
  useEffect(() => {
    const onSave = () => void save();
    window.addEventListener("note:save", onSave);
    return () => window.removeEventListener("note:save", onSave);
  }, [save]);

  // for fetching the notes
  useEffect(() => {
    let cancelled = false;
    getNotes().then((allNotes) => {
      if (!cancelled) setNotes(allNotes);
    });
    return () => {
      cancelled = true;
    };
  }, [searchOpen]);

  useEffect(() => {
    // No initialization before the boot-time tag migration has landed: the
    // note about to load may be rewritten by it right now, and initializing
    // the editor mid-write hands the user pre-seed content whose autosave
    // would overwrite the migrated record and drop the note's legacy tags.
    if (!id || !storageReady) return;

    let cancelled = false;
    setPageLoading(true);

    // This ensures conditional render shows loader
    setLoadedNote(null);
    setNotFound(false);

    // Load note from storage
    getNotes().then((data) => {
      if (cancelled) return;
      const foundNote = data.find((n) => n.id === id);

      if (foundNote) {
        initializeNote(foundNote);
        setLoadedNote(foundNote);
      } else {
        // Unknown/deleted id — stop spinning and say so.
        setNotFound(true);
      }

      // Suggestions for the #autocomplete: inline tags plus the legacy
      // field (until the migration folds it into content).
      setAllTags(
        Array.from(new Set(data.flatMap((n) => getNoteTags(n)))),
      );

      setPageLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [id, setPageLoading, initializeNote, setAllTags, storageReady]);

  /**
   * Every exit from this note (browser back, a palette jump, tag navigation)
   * leaves a note the user never wrote anything in behind. Discard it
   * silently — no toast, no save prompt.
   *
   * The cleanup runs before the note-load effect below re-initializes the
   * atoms for the next id, so on a note-to-note switch the atoms still hold
   * the note being abandoned, and passing the explicit id keeps the discard
   * from ever touching the newly opened note.
   */
  useEffect(() => {
    if (!id) return;
    return () => {
      void discardIfEmpty(id);
    };
  }, [id, discardIfEmpty]);

  useEffect(() => {
    const el = editorScrollRef.current;
    if (!el) {
      setScrollMask({ top: false, bottom: false });
      return;
    }
    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const max = Math.max(0, scrollHeight - clientHeight);
      const hasOverflow = max > 2;
      const atTop = scrollTop <= 1;
      const atBottom = scrollTop >= max - 1;
      setScrollMask({
        top: hasOverflow && !atTop,
        bottom: hasOverflow && !atBottom,
      });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const child = el.firstElementChild as Element | null;
    if (child) ro.observe(child);
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [loadedNote, id, notFound, pageLoading]);

  if (pageLoading || (!loadedNote && !notFound)) {
    return (
      <div className="w-full h-[100dvh] flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="w-full h-[100dvh] flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          This note no longer exists.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => router.push("/")}
        >
          Back to notes
        </Button>
      </div>
    );
  }

  const tooLarge = loadedNote ? isNoteTooLarge(loadedNote.content, loadedNote.title) : false;

  return (
    <div
      className={`relative w-full h-dvh flex flex-col p-4 gap-4 ${!zen ? "xl:w-5xl md:border-l-1 md:border-r-1 md:border-dashed" : "xl:w-[72rem]"}`}
    >
      {/* Note header with actions */}
      {!zen && <NoteHeader temp={!!loadedNote?.expiresAt} />}

      {/* Note title editor */}
      <NoteTitle temp={!!loadedNote?.expiresAt} />

      {/* Node Editor */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={editorScrollRef}
          className="h-full overflow-y-auto pb-14 sm:pb-0"
        >
          {tooLarge ? (
            <div className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-2 px-4 text-center">
              <h2 className="text-base font-medium text-foreground">
                {loadedNote?.title?.trim() || "Untitled"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Note is too large to open safely. Limit: {formatCharLimit(MAX_NOTE_CHARS)}.
              </p>
            </div>
          ) : (
            <NoteContent key={id} initialContent={loadedNote?.content ?? ""} />
          )}
        </div>
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 top-0 z-20 h-8 bg-gradient-to-b from-background to-transparent transition-opacity duration-200 ${scrollMask.top ? "opacity-100" : "opacity-0"}`}
        />
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 h-10 bg-gradient-to-t from-background to-transparent transition-opacity duration-200 ${scrollMask.bottom ? "opacity-100" : "opacity-0"}`}
        />
      </div>

      {/* Footer actions (save, delete, etc.) */}
      <NoteActions save={save} />

      {/* Modal dialogs */}
      <CommandMenu
        open={!!searchOpen}
        openMode={searchOpen || undefined}
        setOpen={(v) => setSearchOpen(typeof v === "function" ? (v(!!searchOpen) ? "commands" : false) : (v ? "commands" : false))}
        notes={notes}
        noteId={id}
      />
      <EditWithAIDialog />
      <DeleteDialog />
      <ExportDialog />
      <SavePromptDialog save={save} />
    </div>
  );
}
