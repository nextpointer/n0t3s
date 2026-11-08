import React, { useCallback, useEffect, useRef } from "react";
import { Note } from "@/lib/types";
import { SolarIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

type Props = {
  note: Note;
  onClick: () => void;
  selecting: boolean;
  selected: boolean;
  onSelect: (id: string, shiftKey: boolean) => void;
};

const NoteCard = React.memo(function NoteCard({
  note,
  onClick,
  selecting,
  selected,
  onSelect,
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
    onClick();
  };

  const active = selecting || selected;

  return (
    <div className="group/row relative flex w-full items-center">
      {/* Hangs outside-left of the note text (which aligns to logo/search),
          sitting in the scroller's gutter. Hidden at rest; row hover shows low
          opacity for this note only; hovering the tick itself shows full
          opacity. Hold row on touch to select. */}
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
          "absolute -left-[22px] top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-[4px]",
          selected
            ? "opacity-100 text-primary"
            : active
              ? "opacity-60 text-foreground/70 hover:opacity-100!"
              : "opacity-0 text-foreground/70 group-hover/row:opacity-25 hover:opacity-100!",
          active
            ? "pointer-events-auto"
            : "pointer-events-none [@media(hover:hover)]:pointer-events-auto",
          "focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <SolarIcon icon="check" className="size-[18px]" />
      </button>

      <div
        onClick={activate}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            activate(e);
          }
        }}
        role="link"
        tabIndex={0}
        data-selected={selected || undefined}
        className="min-w-0 flex-1 cursor-pointer touch-pan-y select-none rounded-lg bg-transparent py-2.5 pl-0 pr-2 hover:bg-foreground/[0.04] data-[selected=true]:bg-foreground/[0.06]"
        style={{ WebkitTouchCallout: "none" }}
        onContextMenu={(e) => {
          // Prevent iOS/Android long-press context menu so hold-to-select works.
          if (pressTimerRef.current || suppressClickRef.current) e.preventDefault();
        }}
        onPointerDown={(e) => {
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
        }}
        onPointerMove={(e) => {
          const origin = pressOriginRef.current;
          if (!pressTimerRef.current || !origin) return;
          if (Math.abs(e.clientX - origin.x) > 8 || Math.abs(e.clientY - origin.y) > 8) clearPress();
        }}
        onPointerUp={clearPress}
        onPointerCancel={clearPress}
        onPointerLeave={clearPress}
      >
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="min-w-0 flex-1 truncate text-[13px] font-medium tracking-tight text-foreground/90 sm:text-[14px]">
            {note.title || "Untitled"}
          </h3>
          <div className="flex shrink-0 items-baseline gap-2 text-[11px] tabular-nums text-muted-foreground/45">
            <span>{(note.content?.length ?? 0).toLocaleString()}c</span>
            <span aria-hidden className="text-muted-foreground/25">·</span>
            <span>
              {new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {" "}
              {new Date(note.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default NoteCard;
