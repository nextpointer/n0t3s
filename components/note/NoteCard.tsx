import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Note } from "@/lib/types";
import { SolarIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

export type NoteCardView = "list" | "grid" | "masonry";

function previewText(content: string, max = 180): string {
  return content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>#-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

type Props = {
  note: Note;
  onOpen: (id: string) => void;
  selecting: boolean;
  selected: boolean;
  onSelect: (id: string, shiftKey: boolean) => void;
  view?: NoteCardView;
};

const NoteCard = React.memo(function NoteCard({
  note,
  onOpen,
  selecting,
  selected,
  onSelect,
  view = "list",
}: Props) {
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);
  const pressOriginRef = useRef<{ x: number; y: number } | null>(null);

  const clearPress = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearPress, [clearPress]);

  const activate = (event: { shiftKey: boolean }) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (selecting) {
      onSelect(note.id, event.shiftKey);
      return;
    }
    onOpen(note.id);
  };

  const active = selecting || selected;
  const preview = useMemo(
    () => (view === "list" ? "" : previewText(note.content || "", view === "masonry" ? 220 : 120)),
    [note.content, view],
  );
  const dateLabel = `${new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${new Date(note.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;

  const interactiveProps = {
    onClick: activate,
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate(e);
      }
    },
    role: "link" as const,
    tabIndex: 0,
    "data-selected": selected || undefined,
    style: { WebkitTouchCallout: "none" } as React.CSSProperties,
    onContextMenu: (e: React.MouseEvent) => {
      if (pressTimerRef.current || suppressClickRef.current) e.preventDefault();
    },
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType !== "touch") return;
      pressOriginRef.current = { x: e.clientX, y: e.clientY };
      clearPress();
      pressTimerRef.current = setTimeout(() => {
        pressTimerRef.current = null;
        suppressClickRef.current = true;
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          try { navigator.vibrate(12); } catch { /* noop */ }
        }
        onSelect(note.id, false);
      }, 420);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const origin = pressOriginRef.current;
      if (!pressTimerRef.current || !origin) return;
      if (Math.abs(e.clientX - origin.x) > 8 || Math.abs(e.clientY - origin.y) > 8) clearPress();
    },
    onPointerUp: clearPress,
    onPointerCancel: clearPress,
    onPointerLeave: clearPress,
  };

  if (view !== "list") {
    return (
      <div
        {...interactiveProps}
        className={cn(
          "group/row relative flex cursor-pointer touch-pan-y select-none flex-col rounded-xl border border-border/50 bg-card p-3 transition-colors hover:border-border hover:bg-accent/40 data-[selected=true]:border-primary/30 data-[selected=true]:bg-primary/[0.04] sm:p-3.5",
          view === "masonry" ? "mb-2 break-inside-avoid sm:mb-3" : "h-full",
        )}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          aria-label={`Select ${note.title || "Untitled"}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(note.id, e.shiftKey);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "absolute right-2 top-2 hidden h-7 w-7 items-center justify-center rounded-md transition-opacity sm:flex",
            selected
              ? "text-primary opacity-100"
              : active
                ? "text-foreground/60 opacity-100"
                : "text-foreground/45 opacity-0 group-hover/row:opacity-100 hover:bg-foreground/[0.05] hover:text-foreground/70",
            "focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <SolarIcon icon="check" className="size-4" />
        </button>
        <div className="flex min-w-0 items-start gap-1.5 pr-8">
          {note.expiresAt ? (
            <SolarIcon
              icon="temp"
              className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60"
              title="Temporary note (auto-deletes in 24 hours)"
            />
          ) : null}
          <h3 className="min-w-0 text-[14px] font-medium leading-snug tracking-tight text-foreground/90">
            {note.title || "Untitled"}
          </h3>
        </div>
        {preview ? (
          <p className={cn("mt-2 text-[12.5px] leading-relaxed text-muted-foreground/70", view === "grid" ? "line-clamp-4" : "")}>
            {preview}
          </p>
        ) : null}
        <div className="mt-3 text-[11px] tabular-nums text-muted-foreground/45">
          {dateLabel}
        </div>
      </div>
    );
  }

  return (
    <div className="group/row flex w-full items-center [content-visibility:auto] [contain-intrinsic-size:auto_52px] sm:px-1">
      {/* Desktop: inline checkbox for reliable multi-select (phone uses hold-to-select). */}
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        aria-label={`Select ${note.title || "Untitled"}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(note.id, e.shiftKey);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          "mr-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-md transition-opacity sm:flex",
          selected
            ? "text-primary opacity-100"
            : active
              ? "text-foreground/60 opacity-100"
              : "text-foreground/45 opacity-0 group-hover/row:opacity-100 hover:bg-foreground/[0.05] hover:text-foreground/70 hover:opacity-100",
          "focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <SolarIcon icon="check" className="size-[18px]" />
      </button>

      <div
        {...interactiveProps}
        className="flex min-w-0 w-full cursor-pointer touch-pan-y select-none items-center justify-between gap-3 bg-transparent px-4 py-3.5 transition-colors hover:bg-foreground/[0.035] data-[selected=true]:bg-foreground/[0.055] sm:rounded-xl sm:px-3 sm:py-2.5"
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {note.expiresAt ? (
            <SolarIcon
              icon="temp"
              className="size-3.5 shrink-0 text-muted-foreground/60"
              title="Temporary note (auto-deletes in 24 hours)"
            />
          ) : null}
          <h3 className="min-w-0 truncate text-[14px] font-medium tracking-tight text-foreground/90 sm:text-[13.5px]">
            {note.title || "Untitled"}
          </h3>
        </div>
        <div className="ml-3 flex shrink-0 items-center justify-end gap-2 text-right text-[11px] tabular-nums text-muted-foreground/50 sm:gap-3">
          <span className="hidden whitespace-nowrap sm:inline">{(note.content?.length ?? 0).toLocaleString()} chars</span>
          <span aria-hidden className="hidden text-muted-foreground/25 sm:inline">·</span>
          <span className="whitespace-nowrap">{dateLabel}</span>
        </div>
      </div>
    </div>
  );
});

export default NoteCard;
