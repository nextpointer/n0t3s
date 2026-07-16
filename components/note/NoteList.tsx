"use client";
import { useRouter } from "next/navigation";
import React, { useCallback, useState } from "react";
import { Note } from "@/lib/types";
import NoteCard from "./NoteCard";
import { ChevronDown } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";
import { addNote } from "@/lib/storage";

function CollapsibleSection({
  title,
  notes,
  isExpanded,
  onToggle,
  onNoteClick,
}: {
  title: string;
  notes: Note[];
  isExpanded: boolean;
  onToggle: () => void;
  onNoteClick: (id: string) => void;
}) {
  return (
    <div className="w-full rounded-2xl border border-dashed  overflow-hidden backdrop-blur-sm bg-card/20">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 hover:bg-accent/20 transition-all duration-200 group"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">
            {title}
          </h2>
          <span className="text-[9px] sm:text-[10px] text-muted-foreground/50 bg-muted/30 px-1.5 py-0.5 rounded-full font-medium min-w-[20px] text-center">
            {notes.length}
          </span>
        </div>
        <ChevronDown
          className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground/50 transition-transform duration-300 ease-out ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>
      {isExpanded && (
        <div className="space-y-1 px-1.5 sm:px-2 pb-1.5 sm:pb-2">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onClick={() => onNoteClick(note.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type Props = {
  notes: Note[];
  orderBy: "newest" | "oldest";
  tagFilter: string;
  loading: boolean;
};

const NotesList = React.memo(function NotesList({
  notes,
  orderBy,
  tagFilter,
  loading,
}: Props) {
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    tagged: true,
    untagged: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const filteredNotes = notes.filter((note) => {
    if (tagFilter === "all") return true;
    if (tagFilter === "untagged") return !note.tags || note.tags.length === 0;
    return note.tags?.includes(tagFilter);
  });

  const pinnedNotes = filteredNotes.filter((note) =>
    note.tags?.includes("pin"),
  );
  const nonPinnedNotes = filteredNotes.filter(
    (note) => !note.tags?.includes("pin"),
  );

  const sortedNonPinned = nonPinnedNotes.sort((a, b) => {
    if (orderBy === "newest") return b.createdAt - a.createdAt;
    return a.createdAt - b.createdAt;
  });

  const sortedNotes = [...pinnedNotes, ...sortedNonPinned];

  const navigateToNote = useCallback((id: string) => {
    router.push(`/note/${id}`);
  }, [router]);

  const handleNewNote = useCallback(() => {
    const id = crypto.randomUUID();
    const now = Date.now();
    addNote({
      id,
      title: "Untitled Note",
      content: "",
      createdAt: now,
      updatedAt: now,
    });
    router.push(`/note/${id}`);
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, idx) => (
          <Skeleton
            key={idx}
            className="w-full h-16 md:h-20 rounded-2xl bg-muted/20 border border-dashed border-border/30"
          />
        ))}
      </div>
    );
  }

  if (sortedNotes.length === 0) {
    return (
      <div className="flex w-full flex-col items-center justify-center px-4 mt-30 text-center sm:mt-24 select-none">
        <h1 className="mb-4 text-3xl font-thin leading-tight tracking-tight text-foreground md:text-5xl text-balance ">
          Your{" "}
          <span className="bg-gradient-to-r from-primary via-purple-500 to-primary bg-[length:200%_auto] bg-clip-text text-transparent">
            privacy
          </span>
          -first
          <br className="block sm:hidden" />{" "}
          <span className="bg-gradient-to-r from-primary via-purple-500 to-primary bg-[length:200%_auto] bg-clip-text text-transparent">
            AI
          </span>{" "}
          <span className="bg-gradient-to-r from-primary via-purple-500 to-primary bg-[length:200%_auto]  bg-clip-text text-transparent">
            markdown
          </span>{" "}
          note editor
        </h1>
        <h2 className="absolute -bottom-8 md:-bottom-10 opacity-25 text-9xl md:text-[12rem] bg-gradient-to-b from-foreground to-transparent bg-clip-text text-transparent select-none">
          N0T3S
        </h2>

        <div className="flex flex-row items-center justify-center w-full gap-3 mt-2 sm:w-auto sm:flex-row">
          <Button
            variant="outline"
            onClick={() => router.push("/help")}
            className="w-auto shadow-none"
          >
            Help : ?
          </Button>

          <Button
            onClick={handleNewNote}
            className="w-auto transition-shadow  sm:w-auto shadow-primary/20 hover:shadow-primary/40"
          >
            Create new Note : )
          </Button>
        </div>
      </div>
    );
  }

  const taggedNotes = sortedNotes.filter((note) => note.tags?.length);
  const untaggedNotes = sortedNotes.filter((note) => !note.tags?.length);

  return (
    <div className="w-full max-w-full overflow-hidden space-y-2.5 sm:space-y-3">
      {tagFilter === "all" ? (
        <>
          {taggedNotes.length > 0 && (
            <CollapsibleSection
              title="Tagged Notes"
              notes={taggedNotes}
              isExpanded={expandedSections.tagged ?? true}
              onToggle={() => toggleSection("tagged")}
              onNoteClick={navigateToNote}
            />
          )}
          {untaggedNotes.length > 0 && (
            <CollapsibleSection
              title="Untagged Notes"
              notes={untaggedNotes}
              isExpanded={expandedSections.untagged ?? true}
              onToggle={() => toggleSection("untagged")}
              onNoteClick={navigateToNote}
            />
          )}
        </>
      ) : (
        <CollapsibleSection
          title={tagFilter === "untagged" ? "Untagged" : `#${tagFilter}`}
          notes={sortedNotes}
          isExpanded={expandedSections[tagFilter] ?? true}
          onToggle={() => toggleSection(tagFilter)}
          onNoteClick={navigateToNote}
        />
      )}
    </div>
  );
});

export default NotesList;
