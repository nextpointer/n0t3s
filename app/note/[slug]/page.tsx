"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSetAtom, useAtomValue, useAtom } from "jotai";
import { Loader } from "@/components/ui/loader";
import { TagInput } from "@/components/TagInput";
import { NoteHeader } from "@/components/note/NoteHeader";
import { NoteTitle } from "@/components/note/NoteTitle";
import { NoteContent } from "@/components/note/NoteContent";
import { NoteActions } from "@/components/note/NoteActions";
import { AskAIDialog } from "@/components/dialogs/AskAIDialog";
import { DeleteDialog } from "@/components/dialogs/DeleteDialog";
import { SavePromptDialog } from "@/components/dialogs/SavePromptDialog";
import {
  pageLoadingAtom,
  allTagsAtom,
  tagsAtom,
  initializeNoteAtom,
  checkUnsavedAtom,
  zenMode,
  search,
} from "@/store/noteAtom";
import { getNotes } from "@/lib/storage";
import { useNoteOperations } from "@/hooks/useNoteOperations";
import { Note } from "@/lib/types";
import { ExportDialog } from "@/components/dialogs/ExportDialog";
import { UseAIShortcuts } from "@/hooks/useAIshortcuts";
import { CommandMenu } from "@/components/CommandMenu";

export default function Page() {
  // Get note ID from URL
  const params = useParams<{ slug: string }>();
  const id = params.slug;

  /**
   * Local state to hold loaded note
   * CRITICAL: This prevents race conditions by ensuring
   * component doesn't render until note is fully loaded
   */
  const [loadedNote, setLoadedNote] = useState<Note | null>(null);
  const [searchOpen, setSearchOpen] = useAtom(search);
  const [notes, setNotes] = useState<Note[]>([]);
  const [zen, setZenMode] = useAtom(zenMode);

  // Read-only atoms
  const pageLoading = useAtomValue(pageLoadingAtom);
  const allTags = useAtomValue(allTagsAtom);
  const tags = useAtomValue(tagsAtom);

  // setters
  const setPageLoading = useSetAtom(pageLoadingAtom);
  const setAllTags = useSetAtom(allTagsAtom);
  const setTags = useSetAtom(tagsAtom);
  const initializeNote = useSetAtom(initializeNoteAtom);
  const checkUnsaved = useSetAtom(checkUnsavedAtom);

  // Initialize auto-save functionality
  useNoteOperations();
  UseAIShortcuts();

  // for fetching the notes
  useEffect(() => {
    const allNotes = getNotes();
    setNotes(allNotes);
  }, [searchOpen]);

  // zen mode keybinding
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "z"
      ) {
        setZenMode((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setZenMode]);

  useEffect(() => {
    if (!id) return;

    setPageLoading(true);

    // This ensures conditional render shows loader
    setLoadedNote(null);

    // Load note from storage
    const data = getNotes();
    const foundNote = data.find((n) => n.id === id);

    if (foundNote) {
      initializeNote(foundNote);
      setLoadedNote(foundNote);
    }

    // Load all tags for suggestions
    setAllTags(Array.from(new Set(data.flatMap((n) => n.tags || []))));

    setPageLoading(false);
  }, [id, setPageLoading, initializeNote, setAllTags]);

  const handleTagsChange = useCallback(
    (newTags: string[]) => {
      setTags(newTags);
      checkUnsaved();
    },
    [setTags, checkUnsaved],
  );

  if (pageLoading || !loadedNote) {
    return (
      <div className="w-full h-[100dvh] flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-dvh flex flex-col p-4 gap-4 ${!zen ? "xl:w-5xl md:border-l-1 md:border-r-1 md:border-dashed" : "xl:w-[72rem]"}`}
    >
      {/* Note header with actions */}
      {!zen && <NoteHeader />}

      {/* Note title editor */}
      <NoteTitle />

      {/* Tag input with suggestions */}
      {!zen && (
        <TagInput
          onChange={handleTagsChange}
          value={tags}
          suggestions={allTags}
        />
      )}

      {/* Node Editor */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-28 sm:pb-0">
        <NoteContent key={id} initialContent={loadedNote.content} />
      </div>

      {/* Footer actions (save, delete, etc.) */}
      <NoteActions />

      {/* Modal dialogs */}
      <CommandMenu open={searchOpen} setOpen={setSearchOpen} notes={notes} />
      <AskAIDialog />
      <DeleteDialog />
      <ExportDialog />
      <SavePromptDialog />
    </div>
  );
}
