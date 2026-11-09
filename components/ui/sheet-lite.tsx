"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * A bottom sheet without Radix. The shadcn Sheet (a radix dialog with
 * tw-animate classes) mounts heavy and its open/close animation jank on
 * phones because it goes through edge-animating keyframes governed
 * unconditionally by a double-rAF render pipeline; this one animates the
 * two compositor-only properties (transform + opacity) with a direct
 * class toggle, so the browser can keep every frame on the GPU the whole
 * time — 60fps by construction.
 *
 * What it keeps from the old sheet: portal, scroll lock, Escape, backdrop
 * dismissal, the drag handle, safe-area clearance, and the rounded-top
 * look. What it drops: focus trapping primitives — consumers that need a
 * focused control focus it themselves (the palette does), and an
 * aria-modal dialog is announced without trapping Tab.
 *
 * Timing matches the old animation without its cost: 240ms in through a
 * decelerating curve, 200ms out on the same transform.
 */

interface SheetLiteProps {
  open: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  /** Same surface the shadcn SheetContent passed (e.g. the palette's
      keyboard inset override on `bottom`). */
  style?: React.CSSProperties;
  /** Extra classes on the sheet panel itself. */
  className?: string;
}

export function SheetLite({ open, onClose, children, style, className }: SheetLiteProps) {
  const [mounted, setMounted] = useState(false);
  const [rendered, setRendered] = useState(open);
  const [shown, setShown] = useState(false);
  const exitTimer = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Enter: flip classes one frame after mounting so the transition runs.
  // Exit: flip classes, unmount when the animation has run.
  useEffect(() => {
    if (open) {
      if (exitTimer.current) window.clearTimeout(exitTimer.current);
      setRendered(true);
      const raf = requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setShown(true);
          // Radix used to autofocus the first focusable on open — the
          // palette depends on landing in its input, so keep parity.
          const el = contentRef.current;
          if (el && !el.contains(document.activeElement)) {
            const first = el.querySelector<HTMLElement>(
              "input, textarea, select, button, [href], [tabindex]:not([tabindex='-1'])",
            );
            first?.focus?.();
          }
        }),
      );
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
    exitTimer.current = window.setTimeout(() => setRendered(false), 200);
    return () => {
      if (exitTimer.current) window.clearTimeout(exitTimer.current);
    };
  }, [open]);

  // Escape closes; the body stops scrolling behind the sheet while open.
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
    <div data-slot="sheet-lite">
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 ease-out motion-reduce:transition-none",
          shown ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        ref={contentRef}
        style={style}
        data-shown={shown || undefined}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex flex-col gap-0 overflow-hidden",
          "rounded-t-2xl border-t border-border/60 bg-popover text-popover-foreground shadow-lg",
          "transition-transform",
          "[transition-timing-function:cubic-bezier(0.32,0.72,0,1)] duration-[240ms]",
          "data-[shown=false]:duration-200 motion-reduce:transition-none",
          shown ? "translate-y-0" : "translate-y-full",
          className,
        )}
      >
        <div
          aria-hidden
          className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-muted-foreground/30"
        />
        {children}
        {/* Keep clear of the home indicator / gesture bar. */}
        <div aria-hidden className="h-2 shrink-0 pb-[env(safe-area-inset-bottom)]" />
      </div>
    </div>,
    document.body,
  );
}
