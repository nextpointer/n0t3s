"use client";

import { memo, useCallback } from "react";
import { useAtom, useAtomValue } from "jotai";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { exportDialogOpenAtom, currentNoteAtom } from "@/store/noteAtom";
import toast from "react-hot-toast";
import { FileText, FileJson, FileDown, ArrowRight } from "lucide-react";

const EXPORT_FORMATS = [
  { id: "pdf", label: "PDF", icon: FileDown },
  { id: "json", label: "JSON", icon: FileJson },
  { id: "markdown", label: "Markdown", icon: FileText },
] as const;

export const ExportDialog = memo(function ExportDialog() {
  const [open, setOpen] = useAtom(exportDialogOpenAtom);
  const note = useAtomValue(currentNoteAtom);

  const handleExport = useCallback(
    async (format: "pdf" | "json" | "markdown") => {
      if (!note) return;

      try {
        if (format === "pdf") {
          // await generateNotePDF(note);
          toast.error("PDF export coming soon");
          return;
        }

        if (format === "json") {
          const blob = new Blob([JSON.stringify(note, null, 2)], {
            type: "application/json",
          });
          downloadBlob(blob, `${sanitizeFilename(note.title)}.json`);
        } else {
          const markdown = `# ${note.title || "Untitled"}\n\n${note.content || ""}`;
          const blob = new Blob([markdown], { type: "text/markdown" });
          downloadBlob(blob, `${sanitizeFilename(note.title)}.md`);
        }

        toast.success(`Exported as ${format.toUpperCase()}`);
        setOpen(false);
      } catch (error) {
        console.error("Export failed:", error);
        toast.error("Failed to export note");
      }
    },
    [note, setOpen],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[280px] gap-4 p-5">
        <DialogHeader className="space-y-1 pb-1">
          <DialogTitle className="text-base font-medium text-left">
            Export as
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          {EXPORT_FORMATS.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant="ghost"
              onClick={() => handleExport(id as "pdf" | "json" | "markdown")}
              className="group justify-start h-9 px-3 hover:bg-accent/60 rounded-md transition-all duration-200"
            >
              <Icon className="mr-2.5 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="text-sm font-medium">{label}</span>
              <ArrowRight className="ml-auto hidden group-hover:inline-block text-foreground/30" />
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
});

function sanitizeFilename(title?: string): string {
  return (title || "note")
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_")
    .toLowerCase();
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
