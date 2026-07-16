import React from "react";
import { Note } from "@/lib/types";
import { Pin } from "lucide-react";

type Props = {
  note: Note;
  onClick: () => void;
};

const NoteCard = React.memo(function NoteCard({ note, onClick }: Props) {
  const isPinned = note.tags?.includes("pin");
  const otherTags = note.tags?.filter((t) => t !== "pin") ?? [];
  const maxTagsToShow = 2;

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      role="link"
      tabIndex={0}
      className="group relative cursor-pointer px-3 sm:px-4 py-2.5 sm:py-3 bg-background/40 hover:bg-accent/30 border border-dashed border-border/40 hover:border-border/60 transition-all duration-200 rounded-[14px] sm:rounded-[16px] backdrop-blur-sm active:scale-[0.99] overflow-hidden"
    >
      <div className="flex items-start justify-between gap-2 sm:gap-3 w-full">
        <div className="flex-1 min-w-0 overflow-hidden">
          <h3 className="font-medium text-[13px] sm:text-[14px] text-foreground/90 truncate tracking-tight leading-snug">
            {note.title}
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
