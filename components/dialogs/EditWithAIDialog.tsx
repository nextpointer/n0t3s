"use client";

import { memo, useState, useCallback, useEffect, useRef, useMemo } from "react";
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
  if (ops.length === 0) {
    return <div className="px-3 py-2 text-[12px] text-muted-foreground/50">No changes</div>;
  }
  return (
    <div className="font-mono text-[12px] leading-5">
      {ops.map((op, i) => {
        const prefix = op.type === "add" ? "+" : op.type === "del" ? "-" : " ";
        return (
          <div
            key={i}
            className={cn(
              "whitespace-pre-wrap break-words px-3 py-px",
              op.type === "add" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
              op.type === "del" && "bg-red-500/10 text-red-700 dark:text-red-400",
              op.type === "ctx" && "text-foreground/60",
            )}
          >
            <span className="mr-2 inline-block w-3 select-none opacity-60">{prefix}</span>
            {op.text || "\u00a0"}
          </div>
        );
      })}
    </div>
  );
}

export const EditWithAIDialog = memo(function EditWithAIDialog() {
  const [open, setOpen] = useAtom(editAIDialogOpenAtom);
  const content = useAtomValue(contentAtom);
  const setContent = useSetAtom(contentAtom);
  const checkUnsaved = useSetAtom(checkUnsavedAtom);
  const [instruction, setInstruction] = useState("");
  const [original, setOriginal] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [resultKey, setResultKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isPhone = useIsPhone();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const { executeAction } = UseAIActions();

  const close = useCallback(() => {
    setOpen(false);
    setInstruction("");
    setResult(null);
    setOriginal("");
    setError(null);
  }, [setOpen]);

  useEffect(() => {
    if (open) {
      setOriginal(content);
      setResult(null);
      setError(null);
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open, content]);

  const run = useCallback(async () => {
    const inst = instruction.trim();
    if (!inst) return;
    if (!original.trim()) {
      setError("Not able to edit");
      return;
    }
    setLoading(true);
    setError(null);
    const out = await executeAction("edit", original, inst);
    if (out != null) {
      setResult(out);
      setResultKey((k) => k + 1);
    } else {
      setError("Not able to edit");
    }
    setLoading(false);
  }, [instruction, original, executeAction]);

  const apply = useCallback(() => {
    if (result == null) return;
    setContent(result);
    checkUnsaved();
    close();
  }, [result, setContent, checkUnsaved, close]);

  const modKey = typeof navigator !== "undefined" && /Mac/.test(navigator.platform) ? "⌘" : "Ctrl";
  const hasResult = result != null;
  const ops = useMemo(() => (hasResult ? diffLines(original, result ?? "") : []), [hasResult, original, result]);

  const body = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          "min-h-0 flex-1 px-5 pb-3 [scrollbar-gutter:stable]",
          hasResult ? "flex flex-col overflow-hidden" : "overflow-y-auto",
        )}
        style={{ scrollbarWidth: "thin" }}
      >
        {loading && !hasResult ? (
          <div className="flex items-center gap-2 pt-6 text-[13px] text-muted-foreground/50">
            <Loader className="size-3.5" /> Working…
          </div>
        ) : error && !hasResult ? (
          <div className="pt-6 text-[13px] text-muted-foreground/55">{error}</div>
        ) : !original.trim() && !hasResult ? (
          <div className="pt-6 text-[13px] text-muted-foreground/50">Not able to edit</div>
        ) : hasResult ? (
          <div key={resultKey} className="animate-ai-fade flex h-full min-h-0 flex-1 flex-col gap-2 pt-1">
            <div className="min-h-0 max-h-[40%] shrink-0 overflow-y-auto rounded-2xl bg-foreground/[0.025] [scrollbar-width:thin]">
              <DiffView ops={ops} />
            </div>
            <textarea
              value={result ?? ""}
              onChange={(e) => setResult(e.target.value)}
              spellCheck={false}
              placeholder="Result…"
              className="h-full min-h-[12rem] w-full flex-1 resize-none rounded-2xl bg-foreground/[0.03] px-4 py-3.5 text-[13.5px] leading-relaxed text-foreground/90 outline-none ring-1 ring-transparent transition-all placeholder:text-muted-foreground/30 focus:bg-foreground/[0.045] focus:ring-foreground/[0.06]"
            />
          </div>
        ) : (
          <div className="pt-2">
            <div className="mb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground/40">Note</div>
            <div className="max-h-48 overflow-y-auto rounded-2xl bg-foreground/[0.025] px-3.5 py-3 text-[12.5px] leading-relaxed text-foreground/55 whitespace-pre-wrap [scrollbar-width:thin]">
              {original.length > 800 ? `${original.slice(0, 800)}…` : original}
            </div>
          </div>
        )}
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
              {hasResult && (
                <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full px-3.5 text-xs text-muted-foreground hover:text-foreground" onClick={close} disabled={loading}>
                  Discard
                </Button>
              )}
              {hasResult && (
                <Button type="button" size="sm" className="h-8 rounded-full px-4 text-xs shadow-none" onClick={apply} disabled={loading}>
                  Apply
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant={hasResult ? "secondary" : "default"}
                onClick={run}
                disabled={loading || !instruction.trim() || !original.trim()}
                className="h-8 rounded-full px-4 text-xs shadow-none"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2"><Loader className="size-3.5" /> Working</span>
                ) : hasResult ? "Retry" : "Generate"}
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
