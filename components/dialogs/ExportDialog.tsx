"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { useTheme } from "next-themes";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SolarIcon, type IconId } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { exportDialogOpenAtom, currentNoteAtom } from "@/store/noteAtom";
import {
  canCopyText,
  downloadBlob,
  exportAsImageBlob,
  exportAsPdfBlob,
  getExportHtmlDocument,
  getMarkdown,
  getPlainText,
  sanitizeFilename,
  shareBlob,
  type ExportFormat,
} from "@/lib/export-note";

type TileFormat = ExportFormat | "copy" | "share";

const FORMAT_TILES: { id: ExportFormat; label: string; icon: IconId }[] = [
  { id: "markdown", label: "Markdown", icon: "fileText" },
  { id: "text", label: "Text", icon: "text" },
  { id: "html", label: "HTML", icon: "fileCode" },
  { id: "pdf", label: "PDF", icon: "fileDownload" },
  { id: "image", label: "Picture", icon: "image" },
];

type ShareNavigator = Navigator & {
  share?: (data?: ShareData) => Promise<void>;
  canShare?: (data?: ShareData) => boolean;
};

function canUseWebShare(): boolean {
  if (typeof navigator === "undefined") return false;
  return typeof (navigator as ShareNavigator).share === "function";
}

export const ExportDialog = memo(function ExportDialog() {
  const [open, setOpen] = useAtom(exportDialogOpenAtom);
  const note = useAtomValue(currentNoteAtom);
  const { resolvedTheme } = useTheme();
  const [busy, setBusy] = useState<TileFormat | null>(null);

  const mode = resolvedTheme === "dark" ? "dark" : "light";
  const title = note?.title || "Untitled";
  const content = note?.content || "";
  const markdown = useMemo(() => getMarkdown(title, content), [title, content]);
  const plainText = useMemo(() => getPlainText(content), [content]);
  const noteIsEmpty = !((note?.title || "").trim() || (note?.content || "").trim());
  const copyAllowed = canCopyText(plainText || markdown);
  const shareAvailable = canUseWebShare();

  const doShareOrDownload = useCallback(
    async (blob: Blob, filename: string) => {
      if (shareAvailable) {
        const res = await shareBlob(blob, filename, title);
        if (res === "shared") {
          toast.success("Shared");
          return;
        }
        if (res === "cancelled") return;
      }
      downloadBlob(blob, filename);
      toast.success("Exported");
    },
    [shareAvailable, title],
  );

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!note || busy || noteIsEmpty) return;
      setBusy(format);
      const base = sanitizeFilename(title);
      try {
        let blob: Blob;
        let filename: string;
        if (format === "markdown") {
          blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
          filename = `${base}.md`;
        } else if (format === "text") {
          blob = new Blob([plainText], { type: "text/plain;charset=utf-8" });
          filename = `${base}.txt`;
        } else if (format === "html") {
          const html = await getExportHtmlDocument(title, content, mode);
          blob = new Blob([html], { type: "text/html;charset=utf-8" });
          filename = `${base}.html`;
        } else if (format === "pdf") {
          blob = await exportAsPdfBlob(title, content, mode);
          filename = `${base}.pdf`;
        } else {
          blob = await exportAsImageBlob(title, content, mode);
          filename = `${base}.png`;
        }

        await doShareOrDownload(blob, filename);
        setOpen(false);
      } catch (error) {
        console.error("Export failed:", error);
        toast.error(`Failed to export ${format === "image" ? "picture" : format}`);
      } finally {
        setBusy(null);
      }
    },
    [note, busy, noteIsEmpty, title, content, markdown, plainText, mode, doShareOrDownload, setOpen],
  );

  const handleCopy = useCallback(async () => {
    if (!note || busy || !copyAllowed || noteIsEmpty) return;
    setBusy("copy");
    try {
      await navigator.clipboard.writeText(plainText);
      toast.success("Copied");
      setOpen(false);
    } catch (error) {
      console.error("Copy failed:", error);
      toast.error("Couldn't copy note");
    } finally {
      setBusy(null);
    }
  }, [note, busy, copyAllowed, noteIsEmpty, plainText, setOpen]);

  const handleShareText = useCallback(async () => {
    if (!note || busy || noteIsEmpty) return;
    setBusy("share");
    try {
      const nav = navigator as ShareNavigator;
      if (typeof nav.share === "function") {
        await nav.share({ title, text: plainText || markdown });
        toast.success("Shared");
        setOpen(false);
      }
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Share failed:", error);
      toast.error("Couldn't share note");
    } finally {
      setBusy(null);
    }
  }, [note, busy, noteIsEmpty, title, plainText, markdown, setOpen]);

  const actionTile = copyAllowed
    ? { id: "copy" as const, label: "Copy", icon: "copy" as IconId, onClick: handleCopy, disabled: false }
    : shareAvailable
      ? { id: "share" as const, label: "Share", icon: "share" as IconId, onClick: handleShareText, disabled: false }
      : { id: "copy" as const, label: "Copy", icon: "copy" as IconId, onClick: handleCopy, disabled: true };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[360px] gap-3 p-5">
        <DialogHeader className="space-y-1 pb-1">
          <DialogTitle className="text-base font-medium text-left">Export as</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {FORMAT_TILES.map(({ id, label, icon }) => (
            <Button
              key={id}
              type="button"
              variant="ghost"
              disabled={!!busy || !note || noteIsEmpty}
              onClick={() => void handleExport(id)}
              className={cn(
                "h-10 justify-start rounded-full px-3 hover:bg-accent/60",
                busy && busy !== id && "opacity-50",
              )}
            >
              {busy === id ? (
                <span className="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
              ) : (
                <SolarIcon icon={icon} className="mr-2 size-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">{busy === id && id !== "pdf" && id !== "image" ? "…" : label}</span>
            </Button>
          ))}
          <Button
            key={actionTile.id}
            type="button"
            variant="ghost"
            disabled={!!busy || !note || noteIsEmpty || actionTile.disabled}
            onClick={() => void actionTile.onClick()}
            className={cn(
              "h-10 justify-start rounded-full px-3 hover:bg-accent/60",
              busy && busy !== actionTile.id && "opacity-50",
            )}
          >
            {busy === actionTile.id ? (
              <span className="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
            ) : (
              <SolarIcon icon={actionTile.icon} className="mr-2 size-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">{busy === actionTile.id ? "Working…" : actionTile.label}</span>
          </Button>
        </div>
        {busy === "pdf" || busy === "image" ? (
          <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
            <span>{busy === "pdf" ? "Generating PDF…" : "Generating picture…"}</span>
          </div>
        ) : noteIsEmpty ? (
          <div className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Note is empty
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
});
