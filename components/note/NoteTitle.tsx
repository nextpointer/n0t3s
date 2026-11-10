"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { titleAtom, checkUnsavedAtom, zenMode, contentAtom, aiEnabledAtom, aiLoadingAtom } from "@/store/noteAtom";
import { consumeNewNoteFlag } from "@/lib/storage";
import { SolarIcon } from "@/lib/icons";
import { UseAIActions } from "@/hooks/useAIActions";
import toast from "react-hot-toast";

export const NoteTitle = memo(function NoteTitle({ temp }: { temp?: boolean }) {
  const [title, setTitle] = useAtom(titleAtom);
  const content = useAtomValue(contentAtom);
  const aiEnabled = useAtomValue(aiEnabledAtom);
  const aiLoading = useAtomValue(aiLoadingAtom);
  const checkUnsaved = useSetAtom(checkUnsavedAtom);
  const { executeAction } = UseAIActions();
  // refs the for the title field (single-line textarea to avoid mobile password autofill)
  const titleInputRef = useRef<HTMLTextAreaElement | null>(null);
  // zen mode state
  const zen = useAtomValue(zenMode);
  // A brand new note opens on the empty title input, ready to type.
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
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = e.target.value.replace(/[\r\n]+/g, " ");
      setTitle(next);
      isNewNoteRef.current = false;
      checkUnsaved();
    },
    [setTitle, checkUnsaved],
  );

  const canGenerateTitle = aiEnabled && !aiLoading && content.trim().length > 0;

  const handleGenerateTitle = useCallback(async () => {
    if (!content.trim()) {
      toast.error("Write a note first");
      return;
    }
    const result = await executeAction("title", content);
    if (!result) return;
    const firstLine = (result.split(/\r?\n/).find((l) => l.trim()) || result).trim();
    const clean = firstLine
      .replace(/^[-*_>\s]+/, "")
      .replace(/^(?:title|heading)\s*[:\-–—]\s*/i, "")
      .replace(/^#{1,6}\s*/, "")
      .replace(/^["'`]+|["'`.,:;!?]+$/g, "")
      .replace(/^[-–—:|\s]+|[-–—:|\s]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!clean) return;
    setTitle(clean);
    isNewNoteRef.current = false;
    checkUnsaved();
  }, [content, executeAction, setTitle, checkUnsaved]);

  return (
    <div
      className={`sticky top-0 z-40 w-full bg-transparent ${zen ? "pt-4" : "pt-13"} pb-1 sm:pb-0`}
    >
      {zen && temp ? (
        <div className="mb-1.5">
          <span
            className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            title="Temporary note — auto-deletes in 24 hours"
          >
            <SolarIcon icon="temp" className="size-3" />
            Temp
          </span>
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <textarea
          className="text-xl sm:text-2xl font-semibold w-full min-w-0 p-0 resize-none overflow-hidden whitespace-nowrap focus-visible:outline-none bg-transparent border-none leading-tight"
          ref={titleInputRef}
          value={title}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Title..."
          name="note-title-field"
          id="note-title-field"
          rows={1}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="sentences"
          spellCheck={false}
          enterKeyHint="next"
          inputMode="text"
          data-1p-ignore="true"
          data-lpignore="true"
          data-bwignore="true"
          data-form-type="other"
          aria-label="Note title"
        />
        <button
          type="button"
          onClick={() => void handleGenerateTitle()}
          disabled={!canGenerateTitle}
          aria-label="Generate title with AI"
          title={canGenerateTitle ? "Generate title with AI" : aiEnabled ? "Write a note to generate a title" : "AI is turned off"}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground/50 transition-colors hover:bg-foreground/[0.05] hover:text-foreground/80 disabled:pointer-events-none disabled:opacity-30"
        >
          <SolarIcon icon="ai" className="size-4" />
        </button>
      </div>
    </div>
  );
});
