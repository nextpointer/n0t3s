import React, { useCallback, useEffect, useRef } from "react";
import { Note } from "@/lib/types";
import { getNoteTags } from "@/lib/tag-syntax";
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
  const tags = getNoteTags(note);
  const isPinned = tags.includes("pin");
  const otherTags = tags.filter((t) => t !== "pin");
  const maxTagsToShow = 2;

  // Long-press enters selection on touch. Movement/cancel kills the timer
  // and the synthetic tap that follows is eaten so selection never also opens.
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
    <div className="group/row flex items-center gap-2 sm:gap-2.5 w-full">
      {/* Selection gutter — separated from the card. Revealed on hover
          (fine pointers) or while selecting; on touch it only appears once
          a long-press has entered selection mode. */}
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
        data-state={selected ? "checked" : "unchecked"}
        data-active={active || undefined}
        className={cn(
          "shrink-0 h-[18px] w-[18px] rounded-[5px] border flex items-center justify-center",
          "transition-all duration-150",
          "border-border/60 bg-background/60 text-transparent",
          "hover:border-foreground/40",
          "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
          // hidden by default; hover-revealed on devices that hover; always
          // interactive+visible while selection is active
          "opacity-0 pointer-events-none",
          "[@media(hover:hover)]:group-hover/row:opacity-100 [@media(hover:hover)]:group-hover/row:pointer-events-auto",
          "data-[active]:opacity-100 data-[active]:pointer-events-auto",
          "focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <SolarIcon
          icon="check"
          className={cn(
            "h-3 w-3 transition-transform duration-150",
            selected ? "scale-100" : "scale-0",
          )}
        />
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
        className="group relative flex-1 min-w-0 cursor-pointer px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-lg bg-transparent data-[selected=true]:bg-foreground/[0.06] hover:bg-foreground/[0.04] transition-colors duration-100 overflow-hidden"
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
          if (Math.abs(e.clientX - origin.x) > 8 || Math.abs(e.clientY - origin.y) > 8) {
            clearPress();
          }
        }}
        onPointerUp={clearPress}
        onPointerCancel={clearPress}
      >
        <div className="flex items-start justify-between gap-2 sm:gap-3 w-full">
          <div className="flex-1 min-w-0 overflow-hidden">
            <h3 className="font-medium text-[13px] sm:text-[14px] text-foreground/90 truncate tracking-tight leading-snug">
              {note.title || "Untitled"}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground/50 font-medium tracking-wide mt-0.5">
              {new Date(note.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
          {(isPinned || otherTags.length > 0) && (
            <div className="flex flex-wrap gap-1 items-start justify-end max-w-[120px] sm:max-w-[140px] shrink-0">
              {isPinned && (
                <span className="text-[9px] sm:text-[10px] bg-foreground text-background px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-semibold tracking-wider uppercase whitespace-nowrap inline-flex items-center">
                  <SolarIcon icon="pin" className="h-3 w-3" />
                </span>
              )}
              {otherTags.slice(0, maxTagsToShow).map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] sm:text-[10px] bg-muted/60 text-muted-foreground/70 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-medium tracking-wide truncate max-w-[60px] sm:max-w-[80px]"
                  title={tag}
                >
                  {tag}
                </span>
              ))}
              {otherTags.length > maxTagsToShow && (
                <span className="text-[9px] sm:text-[10px] text-muted-foreground/40 font-semibold whitespace-nowrap">
                  +{otherTags.length - maxTagsToShow}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default NoteCard;
