"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { titleAtom, checkUnsavedAtom, zenMode } from "@/store/noteAtom";
import { consumeNewNoteFlag } from "@/lib/storage";

export const NoteTitle = memo(function NoteTitle() {
  const [title, setTitle] = useAtom(titleAtom);
  const checkUnsaved = useSetAtom(checkUnsavedAtom);
  // refs the for the input
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  // zen mode state
  const zen = useAtomValue(zenMode);
  // A brand new note opens with the title pre-selected so typing replaces it.
  const isNewNoteRef = useRef(false);

  // first load focus and select
  useEffect(() => {
    const titleInput = titleInputRef.current;
    if (!titleInput) return;
    titleInput.focus();
    if (consumeNewNoteFlag()) {
      isNewNoteRef.current = true;
      titleInput.select();
    }
  }, []);

  // Enter leaves the title and drops into the note body.
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const textarea = document.querySelector<HTMLTextAreaElement>(
      ".note-editor-container textarea.overtype-input",
    );
    if (!textarea) return;
    e.preventDefault();
    textarea.focus();
    // Put the caret at the very start of the body.
    textarea.setSelectionRange(0, 0);
    isNewNoteRef.current = false;
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTitle(e.target.value);
      isNewNoteRef.current = false;
      checkUnsaved();
    },
    [setTitle, checkUnsaved],
  );

  return (
    <div
      className={`sticky top-0 z-40 w-full bg-transparent ${zen ? "pt-4" : "pt-13"} pb-2`}
    >
      <input
        className={`${
          zen ? "ml-3" : ""
        } text-xl sm:text-2xl font-semibold w-full p-0 focus-visible:outline-none bg-transparent border-none`}
        ref={titleInputRef}
        value={title}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Title..."
      />
    </div>
  );
});
