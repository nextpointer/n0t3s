"use client";

import { memo, useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { contentAtom, checkUnsavedAtom, editAIDialogOpenAtom } from "@/store/noteAtom";
import { UseAIActions } from "@/hooks/useAIActions";
import { useIsPhone } from "@/hooks/use-is-phone";
import { SolarIcon } from "@/lib/icons";
import { diffLines, type DiffOp } from "@/lib/diff-lines";
import { cn } from "@/lib/utils";

function useDialogMount(open: boolean) {
  const [mounted, setMounted] = useState(false);
  const [rendered, setRendered] = useState(open);
  const [shown, setShown] = useState(false);
  const exitTimer = useRef<number | null>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open) {
      if (exitTimer.current) window.clearTimeout(exitTimer.current);
      setRendered(true);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
    exitTimer.current = window.setTimeout(() => setRendered(false), 220);
    return () => {
      if (exitTimer.current) window.clearTimeout(exitTimer.current);
    };
  }, [open]);
  return { mounted, rendered, shown };
}

function RightSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const { mounted, rendered, shown } = useDialogMount(open);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted || !rendered) return null;
  return createPortal(
    <div>
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-50 bg-black/25 transition-opacity duration-200",
          shown ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "fixed inset-y-3 right-0 z-50 flex w-full max-w-[580px] flex-col overflow-hidden bg-background/98 shadow-2xl backdrop-blur-xl transition-transform duration-[240ms]",
          "rounded-tl-3xl rounded-bl-3xl [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]",
          shown ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex shrink-0 items-center justify-between px-5 pb-1 pt-4">
          <span className="text-[13px] font-medium tracking-tight text-foreground/70">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-muted-foreground/50 transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
          >
            <SolarIcon icon="close" className="size-4" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

function FullScreenDialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const { mounted, rendered, shown } = useDialogMount(open);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted || !rendered) return null;
  return createPortal(
    <div>
      <div
        aria-hidden
        className={cn(
          "fixed inset-0 z-50 bg-black/20 transition-opacity duration-200",
          shown ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "fixed inset-0 z-50 flex flex-col bg-background transition-[opacity,transform] duration-[240ms]",
          "[transition-timing-function:cubic-bezier(0.32,0.72,0,1)]",
          shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        )}
      >
        <div
          className="flex shrink-0 items-center justify-between px-4 pb-1"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <span className="text-[13px] font-medium tracking-tight text-foreground/70">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-muted-foreground/50 transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
          >
            <SolarIcon icon="close" className="size-4" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

function DiffView({ ops }: { ops: DiffOp[] }) {
  if (ops.length === 0) return <div className="px-1 text-[13px] text-muted-foreground/45">No changes.</div>;
  return (
    <div className="overflow-x-auto font-mono text-[12px] leading-6">
      {ops.map((op, i) => (
        <div
          key={i}
          className={cn(
            "grid grid-cols-[16px_1fr] gap-2 px-1 py-px whitespace-pre-wrap break-words",
            op.type === "add" && "text-emerald-600 dark:text-emerald-400",
            op.type === "del" && "text-rose-500/90 dark:text-rose-400/90",
            op.type === "ctx" && "text-foreground/40",
          )}
        >
          <span className="select-none">{op.type === "add" ? "+" : op.type === "del" ? "-" : " "}</span>
          <span className={op.type === "del" ? "line-through decoration-rose-500/30" : ""}>{op.text || " "}</span>
        </div>
      ))}
    </div>
  );
}

export const EditWithAIDialog = memo(function EditWithAIDialog() {
  const [open, setOpen] = useAtom(editAIDialogOpenAtom);
  const content = useAtomValue(contentAtom);
  const setContent = useSetAtom(contentAtom);
  const checkUnsaved = useSetAtom(checkUnsavedAtom);
  const [instruction, setInstruction] = useState("");
  // `result` is the editable proposed text once generated.
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isPhone = useIsPhone();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const { executeAction } = UseAIActions();

  const close = useCallback(() => {
    setOpen(false);
    setInstruction("");
    setResult(null);
    setError(null);
  }, [setOpen]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open]);

  const run = useCallback(async () => {
    const inst = instruction.trim();
    if (!inst) return;
    if (!content.trim()) {
      setError("Not able to edit");
      return;
    }
    setLoading(true);
    setError(null);
    const out = await executeAction("edit", content, inst);
    if (out != null) setResult(out);
    else setError("Not able to edit");
    setLoading(false);
  }, [instruction, content, executeAction]);

  const apply = useCallback(() => {
    if (result == null) return;
    setContent(result);
    checkUnsaved();
    close();
  }, [result, setContent, checkUnsaved, close]);

  const ops = result != null ? diffLines(content, result) : null;
  const modKey = typeof navigator !== "undefined" && /Mac/.test(navigator.platform) ? "⌘" : "Ctrl";

  // Scrollable top: diff + editable result. Sticky bottom: prompt + actions.
  const body = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="min-h-0 flex-1 overflow-y-auto px-5 pb-3 [scrollbar-gutter:stable]"
        style={{ scrollbarWidth: "thin" }}
      >
        {loading && ops == null ? (
          <div className="flex items-center gap-2 pt-6 text-[13px] text-muted-foreground/50">
            <Loader className="size-3.5" /> Working…
          </div>
        ) : error && ops == null ? (
          <div className="pt-6 text-[13px] text-muted-foreground/55">{error}</div>
        ) : !content.trim() && ops == null ? (
          <div className="pt-6 text-[13px] text-muted-foreground/50">Not able to edit</div>
        ) : ops != null ? (
          <div className="space-y-5 pt-1">
            <DiffView ops={ops} />
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground/45">Result</span>
                <span className="text-[10px] text-muted-foreground/30">editable</span>
              </div>
              <textarea
                value={result ?? ""}
                onChange={(e) => setResult(e.target.value)}
                spellCheck={false}
                placeholder="Result…"
                className="min-h-[160px] w-full resize-y rounded-2xl bg-foreground/[0.03] px-4 py-3.5 font-mono text-[12.5px] leading-relaxed text-foreground/85 outline-none ring-1 ring-transparent transition-all placeholder:text-muted-foreground/30 focus:bg-foreground/[0.045] focus:ring-foreground/[0.06]"
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="shrink-0 bg-gradient-to-t from-background via-background to-background/85 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        <div className="group rounded-[1.25rem] bg-foreground/[0.035] ring-1 ring-foreground/[0.04] transition-all focus-within:bg-foreground/[0.05] focus-within:ring-foreground/[0.08]">
          <textarea
            ref={inputRef}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                run();
              }
            }}
            placeholder="Describe the edit…"
            rows={2}
            disabled={loading}
            className="w-full resize-none bg-transparent px-4 py-3 text-[14px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/40"
          />
          <div className="flex items-center justify-between gap-2 px-3 pb-2.5">
            <div className="min-w-0">
              {!isPhone && (
                <span className="select-none text-[10px] text-muted-foreground/30">{modKey}+Enter</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {ops != null && (
                <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full px-3.5 text-xs text-muted-foreground hover:text-foreground" onClick={close} disabled={loading}>
                  Discard
                </Button>
              )}
              {ops != null && (
                <Button type="button" size="sm" className="h-8 rounded-full px-4 text-xs shadow-none" onClick={apply} disabled={loading}>
                  Apply
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant={ops != null ? "secondary" : "default"}
                onClick={run}
                disabled={loading || !instruction.trim() || !content.trim()}
                className="h-8 rounded-full px-4 text-xs shadow-none"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2"><Loader className="size-3.5" /> Working</span>
                ) : ops != null ? "Retry" : "Generate"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isPhone) {
    return (
      <FullScreenDialog open={open} onClose={close} title="Edit with AI">
        {body}
      </FullScreenDialog>
    );
  }

  return (
    <RightSheet open={open} onClose={close} title="Edit with AI">
      {body}
    </RightSheet>
  );
});

/** Compatibility export while imports migrate. */
export const AskAIDialog = EditWithAIDialog;
