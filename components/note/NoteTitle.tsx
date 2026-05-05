"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { titleAtom, checkUnsavedAtom, zenMode } from "@/store/noteAtom";

export const NoteTitle = memo(function NoteTitle() {
  const [title, setTitle] = useAtom(titleAtom);
  const checkUnsaved = useSetAtom(checkUnsavedAtom);
  // refs the for the input
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  // zen mode state
  const zen = useAtomValue(zenMode);
  // first load focus and select
  useEffect(() => {
    const titleInput = titleInputRef.current;
    if (titleInput) {
      titleInput.focus();
    }
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTitle(e.target.value);
      checkUnsaved();
    },
    [setTitle, checkUnsaved],
  );

  return (
    <input
      className={`${zen ? "ml-3" : ""} text-xl sm:text-2xl font-semibold w-full p-0 focus-visible:outline-none border-none mt-10`}
      ref={titleInputRef}
      value={title}
      onChange={handleChange}
      placeholder="Title..."
    />
  );
});
