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
    <div className="group/row flex items-center w-full gap-2.5">
      {/* Permanent left space, no layout/hover animation. Tick sits at very
          low opacity; hovering the tick itself brings it to full opacity.
          On touch it stays non-interactive until selection is active
          (hold-to-select on the row). */}
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
        data-active={active || undefined}
        className={cn(
          "group/tick shrink-0 flex h-5 w-5 items-center justify-center rounded-md transition-opacity duration-100",
          // very low affordance at rest; hover the tick -> full
          active ? "opacity-100" : "opacity-15 hover:opacity-100",
          // touch: don't steal taps until selecting; fine pointers can hover it
          active
            ? "pointer-events-auto"
            : "pointer-events-none [@media(hover:hover)]:pointer-events-auto",
          selected
            ? "text-primary"
            : "text-foreground",
          "focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <SolarIcon icon="check" className="size-[15px]" />
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
        className="group relative flex-1 min-w-0 cursor-pointer rounded-lg bg-transparent px-2.5 py-2.5 transition-colors duration-100 hover:bg-foreground/[0.04] data-[selected=true]:bg-foreground/[0.06]"
        onPointerDown={(e) => {
          if (e.pointerType !== "touch") return;
          pressOriginRef.current = { x: e.clientX, y: e.clientY };
          clearPress();
          pressTimerRef.current = setTimeout(() => {
            pressTimerRef.current = null;
            suppressClickRef.current = true;
            onSelect(note.id, false);
          }, 450);
        }}
        onPointerMove={(e) => {
          const origin = pressOriginRef.current;
          if (!pressTimerRef.current || !origin) return;
          if (Math.abs(e.clientX - origin.x) > 8 || Math.abs(e.clientY - origin.y) > 8) clearPress();
        }}
        onPointerUp={clearPress}
        onPointerCancel={clearPress}
      >
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="min-w-0 truncate text-[13px] sm:text-[14px] font-medium tracking-tight text-foreground/90">
            {note.title || "Untitled"}
          </h3>
          <span className="shrink-0 text-[11px] text-muted-foreground/45 tabular-nums">
            {new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
      </div>
    </div>
  );
});

export default NoteCard;
