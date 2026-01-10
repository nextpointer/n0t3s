"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSetAtom, useAtomValue } from "jotai";
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
} from "@/store/noteAtom";
import { getNotes } from "@/lib/storage";
import { useNoteOperations } from "@/hooks/useNoteOperations";
import { Note } from "@/lib/types";
import { ExportDialog } from "@/components/dialogs/ExportDialog";
import { UseAIShortcuts } from "@/hooks/useAIshortcuts";

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
    <div className="w-full h-[100dvh] max-h-[100dvh] md:w-4xl flex flex-col p-4 gap-4 overflow-hidden relative md:border-l-1 md:border-r-1 md:border-dashed">
      {/* Note header with actions */}
      <NoteHeader />

      {/* Note title editor */}
      <NoteTitle />

      {/* Tag input with suggestions */}
      <TagInput
        onChange={handleTagsChange}
        value={tags}
        suggestions={allTags}
      />

      {/* Node Editor */}
      <NoteContent key={id} initialContent={loadedNote.content} />

      {/* Footer actions (save, delete, etc.) */}
      <NoteActions />

      {/* Modal dialogs */}
      <AskAIDialog />
      <DeleteDialog />
      <ExportDialog />
      <SavePromptDialog />
    </div>
  );
}
