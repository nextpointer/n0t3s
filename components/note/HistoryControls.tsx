"use client";

import { memo, useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { Undo2, Redo2 } from "lucide-react";
import { canUndoAtom, canRedoAtom, undoAtom, redoAtom } from "@/store/noteAtom";
import toast from "react-hot-toast";

export const HistoryControls = memo(function HistoryControls() {
  // getter
  const canUndo = useAtomValue(canUndoAtom);
  const canRedo = useAtomValue(canRedoAtom);
  // setter
  const undo = useSetAtom(undoAtom);
  const redo = useSetAtom(redoAtom);

  // handler for undo
  const handleUndo = useCallback(() => {
    const result = undo();
    if (result !== null) {
      toast.success("Undo successful", { id: "undo" });
    } else {
      toast.error("Nothing to undo", { id: "undo" });
    }
  }, [undo]);

  // handler for redo
  const handleRedo = useCallback(() => {
    const result = redo();
    if (result !== null) {
      toast.success("Redo successful", { id: "redo" });
    } else {
      toast.error("Nothing to redo", { id: "redo" });
    }
  }, [redo]);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleUndo}
        disabled={!canUndo}
        aria-label="Undo"
      >
        <Undo2 className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRedo}
        disabled={!canRedo}
        aria-label="Redo"
      >
        <Redo2 className="w-4 h-4" />
      </Button>
    </>
  );
});
