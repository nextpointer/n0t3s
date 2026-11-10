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
import { SolarIcon, type IconId } from "@/lib/icons";

const EXPORT_FORMATS: { id: "pdf" | "json" | "markdown"; label: string; icon: IconId }[] = [
  { id: "pdf", label: "PDF", icon: "fileDownload" },
  { id: "json", label: "JSON", icon: "fileCode" },
  { id: "markdown", label: "Markdown", icon: "fileText" },
];

export const ExportDialog = memo(function ExportDialog() {
  const [open, setOpen] = useAtom(exportDialogOpenAtom);
  const note = useAtomValue(currentNoteAtom);

  const handleExport = useCallback(
    (format: "pdf" | "json" | "markdown") => {
      if (!note) return;
      try {
        if (format === "pdf") {
          toast.error("PDF export coming soon");
          return;
        }
        let blob: Blob;
        let filename: string;
        if (format === "json") {
          blob = new Blob([JSON.stringify(note, null, 2)], { type: "application/json;charset=utf-8" });
          filename = `${sanitizeFilename(note.title)}.json`;
        } else {
          const markdown = `# ${note.title || "Untitled"}\n\n${note.content || ""}`;
          blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
          filename = `${sanitizeFilename(note.title)}.md`;
        }
        // Close first so dialog focus/overlay cleanup can't interfere with the download.
        setOpen(false);
        window.setTimeout(() => {
          try {
            downloadBlob(blob, filename);
            toast.success(`Exported as ${format.toUpperCase()}`);
          } catch (err) {
            console.error("Export failed:", err);
            toast.error("Failed to export note");
          }
        }, 0);
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
          <DialogTitle className="text-base font-medium text-left">Export as</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          {EXPORT_FORMATS.map(({ id, label, icon }) => (
            <Button
              key={id}
              variant="ghost"
              onClick={() => handleExport(id)}
              className="group justify-start h-9 px-3 hover:bg-accent/60 rounded-md transition-all duration-200"
            >
              <SolarIcon icon={icon} className="mr-2.5 size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="text-sm font-medium">{label}</span>
              <SolarIcon icon="arrowRight" className="ml-auto hidden size-4 group-hover:inline-block text-foreground/30" />
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
});

function sanitizeFilename(title?: string): string {
  return (title || "note").replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_").toLowerCase();
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
