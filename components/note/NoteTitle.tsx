"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import { useAtom, useSetAtom } from "jotai";
import { titleAtom, checkUnsavedAtom } from "@/store/noteAtom";

export const NoteTitle = memo(function NoteTitle() {
  const [title, setTitle] = useAtom(titleAtom);
  const checkUnsaved = useSetAtom(checkUnsavedAtom);
  // refs the for the input
  const titleInputRef = useRef<HTMLInputElement | null>(null);

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
      className="text-xl sm:text-2xl font-semibold w-full p-0 focus-visible:outline-none border-none"
      ref={titleInputRef}
      value={title}
      onChange={handleChange}
      placeholder="Title..."
    />
  );
});
