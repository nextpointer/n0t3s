import React, { useCallback, useEffect, useRef } from "react";
import { Note } from "@/lib/types";
import { SolarIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

type Props = {
  note: Note;
  onOpen: (id: string) => void;
  selecting: boolean;
  selected: boolean;
  onSelect: (id: string, shiftKey: boolean) => void;
};

const NoteCard = React.memo(function NoteCard({
  note,
  onOpen,
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
    onOpen(note.id);
  };

  const active = selecting || selected;

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
        className="flex min-w-0 w-full cursor-pointer touch-pan-y select-none items-center justify-between gap-3 bg-transparent px-4 py-3.5 transition-colors hover:bg-foreground/[0.035] data-[selected=true]:bg-foreground/[0.055] sm:rounded-xl sm:px-3 sm:py-2.5"
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
        <h3 className="min-w-0 flex-1 truncate text-[14px] font-medium tracking-tight text-foreground/90 sm:text-[13.5px]">
          {note.title || "Untitled"}
        </h3>
        <div className="ml-3 flex shrink-0 items-center justify-end gap-2 text-right text-[11px] tabular-nums text-muted-foreground/50 sm:gap-3">
          <span className="hidden whitespace-nowrap sm:inline">{(note.content?.length ?? 0).toLocaleString()} chars</span>
          <span aria-hidden className="hidden text-muted-foreground/25 sm:inline">·</span>
          <span className="whitespace-nowrap">
            {new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {" "}
            {new Date(note.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </span>
        </div>
      </div>
    </div>
  );
});

export default NoteCard;
