import React, { useCallback, useEffect, useRef } from "react";
import { Note } from "@/lib/types";
import { getNoteTags } from "@/lib/tag-syntax";
import { Pin, Check } from "lucide-react";

type Props = {
  note: Note;
  onClick: () => void;
  /** True while at least one note is selected anywhere on the screen. */
  selecting: boolean;
  selected: boolean;
  /**
   * Toggle this note's selection. `shiftKey` extends the selection to the
   * full ordered range between the last touched note and this one, the way
   * Notion's list does.
   */
  onSelect: (id: string, shiftKey: boolean) => void;
};

const NoteCard = React.memo(function NoteCard({
  note,
  onClick,
  selecting,
  selected,
  onSelect,
}: Props) {
  // Tags are #mentions in the content; the legacy field rides along until
  // the migration folds it in.
  const tags = getNoteTags(note);
  const isPinned = tags.includes("pin");
  const otherTags = tags.filter((t) => t !== "pin");
  const maxTagsToShow = 2;

  // Long-press is the touch-device entry into selection mode (hover cannot
  // reveal the checkbox there). A moving, cancelled or released press kills
  // the timer, and the tap that the gesture would eventually fire is eaten
  // once so opening selection never also opens the note.
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
    // A long-press's synthetic tap must not navigate behind the card.
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

  return (
    <div
      onClick={activate}
      onKeyDown={(e) => {
        // The selection checkbox handles its own keys; keyboard activation
        // of the card itself must not leak into its children.
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate(e);
        }
      }}
      role="link"
      tabIndex={0}
      data-selected={selected || undefined}
      className="group relative cursor-pointer px-3 sm:px-4 py-2.5 sm:py-3 bg-accent/30 data-[selected=true]:bg-accent/70 hover:bg-accent/70 border border-dashed border-border/40 hover:border-border/60 data-[selected=true]:border-border/60 transition-all duration-200 rounded-[14px] sm:rounded-[16px] backdrop-blur-sm active:scale-[0.99] overflow-hidden"
    >
      <div className="flex items-start justify-between gap-2 sm:gap-3 w-full">
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
          data-selecting={selecting}
          className="shrink-0 h-4 w-4 mt-[1.5px] rounded-[5px] border border-border/70 bg-background/60 flex items-center justify-center transition-all duration-150 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 data-[state=checked]:opacity-100 data-[selecting=true]:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring hover:border-foreground/50 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
        >
          {selected && (
            <Check
              className="h-3 w-3 text-primary-foreground"
              strokeWidth={3.5}
            />
          )}
        </button>
        <div
          className="flex-1 min-w-0 overflow-hidden"
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
            if (
              Math.abs(e.clientX - origin.x) > 8 ||
              Math.abs(e.clientY - origin.y) > 8
            ) {
              clearPress();
            }
          }}
          onPointerUp={clearPress}
          onPointerCancel={clearPress}
        >
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
          <div className="flex flex-wrap gap-1 items-start justify-end max-w-[120px] sm:max-w-[140px] flex-shrink-0">
            {isPinned && (
              <span className="text-[9px] sm:text-[10px] bg-foreground text-background px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-semibold tracking-wider uppercase whitespace-nowrap">
                <Pin className="h-3 w-3" />
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
  );
});

export default NoteCard;
