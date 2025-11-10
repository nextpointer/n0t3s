"use client";

import { memo, useState, useCallback } from "react";
import { useAtom, useAtomValue } from "jotai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader } from "@/components/ui/loader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { askDialogOpenAtom, contentAtom } from "@/store/noteAtom";
import { useAIActions } from "@/hooks/useAIActions";
import toast from "react-hot-toast";

export const AskAIDialog = memo(function AskAIDialog() {
  const [open, setOpen] = useAtom(askDialogOpenAtom);
  const content = useAtomValue(contentAtom);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const { executeAction } = useAIActions();

  // handler for asking question
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!question.trim()) {
        toast.error("Please enter a question");
        return;
      }

      setLoading(true);
      // getting result
      const result = await executeAction("ask", content, question);
      if (result) {
        setAnswer(result);
      }
      setLoading(false);
    },
    [question, content, executeAction],
  );

  // handler for dialog open
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        setQuestion("");
        setAnswer("");
      }
      setOpen(isOpen);
    },
    [setOpen],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 border-0 bg-transparent shadow-none">
        <div className="bg-background rounded-xl border p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium">Ask AI</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything about this note..."
              className="border-0 bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/50"
              disabled={loading}
            />

            {answer && (
              <div className="p-3 bg-muted/30 rounded-xl border border-border/50">
                <p className="text-sm text-foreground/90">{answer}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all shadow-sm"
            >
              {loading ? (
                <>
                  <Loader className="text-background" />
                  Processing...
                </>
              ) : (
                <span className="bg-gradient-to-r from-background/90 to-background/70 bg-clip-text text-transparent">
                  Ask AI
                </span>
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
});
