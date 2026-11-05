import { useAtom, useSetAtom, useAtomValue } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import {
  currentNoteAtom,
  titleAtom,
  contentAtom,
  unsavedAtom,
  saveLoadingAtom,
  autoSaveAtom,
} from "@/store/noteAtom";
import { updateNote } from "@/lib/storage";
import { extractTags } from "@/lib/tag-syntax";
import toast from "react-hot-toast";

export function useNoteOperations() {
  const [note, setNote] = useAtom(currentNoteAtom);

  const title = useAtomValue(titleAtom);
  const content = useAtomValue(contentAtom);

  const [unsaved, setUnsaved] = useAtom(unsavedAtom);
  const autoSave = useAtomValue(autoSaveAtom);
  const setSaveLoading = useSetAtom(saveLoadingAtom);

  // Ref to store timeout ID
  // have to clear the previous timer if user write anything before autosave
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // manual save handler
  const save = useCallback(
    async (isAutoSave = false) => {
      if (!note) return;

      setSaveLoading(true);
      try {
        const updated = {
          ...note,
          title,
          content,
          // Tags live in the text: every #mention becomes a note tag, and
          // edits to the text alone can retire them.
          tags: extractTags(content),
          updatedAt: Date.now(),
        };

        await updateNote(updated);
        setNote(updated);
        setUnsaved(false);

        if (!isAutoSave) {
          toast.success("Note saved successfully", { id: "saved" });
        }
      } catch {
        toast.error("Failed to save", { id: "error" });
      } finally {
        setSaveLoading(false);
      }
    },
    [note, title, content, setNote, setSaveLoading, setUnsaved],
  );

  // Auto-save effect
  useEffect(() => {
    if (!autoSave || !unsaved || !note) return;

    // clear the previous timer
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // store the timeid in the ref
    saveTimeoutRef.current = setTimeout(() => {
      void save(true);
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, content, autoSave, unsaved, note, save]);

  return { save };
}
