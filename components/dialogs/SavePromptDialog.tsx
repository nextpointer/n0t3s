"use client";

import { memo, useCallback } from "react";
import { useAtom, useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  savePromptDialogOpenAtom,
  navigationTargetAtom,
} from "@/store/noteAtom";
import { useNoteOperations } from "@/hooks/useNoteOperations";

export const SavePromptDialog = memo(function SavePromptDialog() {
  const [open, setOpen] = useAtom(savePromptDialogOpenAtom);
  const target = useAtomValue(navigationTargetAtom);
  const { save } = useNoteOperations();
  const router = useRouter();

  // handler for save the unsaved changes
  const handleSave = useCallback(() => {
    save(false);
    if (target) {
      router.push(target);
    }
    setOpen(false);
  }, [save, target, router, setOpen]);

  // handler for discard
  const handleDiscard = useCallback(() => {
    if (target) {
      router.push(target);
    }
    setOpen(false);
  }, [target, router, setOpen]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unsaved Changes</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          You have unsaved changes. Do you want to save before leaving?
        </p>
        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={handleDiscard}
            className="shadow-none rounded-2xl"
          >
            Discard
          </Button>
          <Button
            variant="secondary"
            onClick={() => setOpen(false)}
            className="shadow-none rounded-2xl"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} className="shadow-none rounded-2xl">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
