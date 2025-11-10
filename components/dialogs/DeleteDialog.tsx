"use client";

import { memo, useCallback } from "react";
import { useAtom, useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteDialogOpenAtom, currentNoteAtom } from "@/store/noteAtom";
import { deleteNote } from "@/lib/storage";
import toast from "react-hot-toast";

export const DeleteDialog = memo(function DeleteDialog() {
  const [open, setOpen] = useAtom(deleteDialogOpenAtom);
  const note = useAtomValue(currentNoteAtom);
  const router = useRouter();

  // handler for confirm delete
  const handleConfirm = useCallback(() => {
    if (!note) return;
    try {
      deleteNote(note.id);
      setOpen(false);
      router.push("/");
      toast.success("Note deleted successfully", { id: "deleted" });
    } catch {
      toast.error("Failed to delete note", { id: "error" });
    }
  }, [note, setOpen, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Note</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete this note? This action cannot be
          undone.
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="shadow-none rounded-2xl"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            className="shadow-none rounded-2xl"
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});
