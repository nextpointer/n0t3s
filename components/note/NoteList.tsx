"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Note } from "@/lib/types";
import NoteCard from "./NoteCard";
import { ChevronDown } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import DownArrow from "../icons/DownArrow";
import { Button } from "../ui/button";
import { addNote } from "@/lib/storage";

type Props = {
  notes: Note[];
  orderBy: "newest" | "oldest";
  tagFilter: string;
  loading: boolean;
};

export default function NotesList({
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

  function handleNewNote() {
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
  }

  if (sortedNotes.length === 0) {
    return (
      <div className="w-full text-center mt-4 text-muted-foreground/50  flex justify-center items-center flex-col">
        <DownArrow className="w-4" />
        <p className="text-sm font-medium ">No notes available : (</p>
        <Button className="mt-4" onClick={handleNewNote}>
          Create new Note : )
        </Button>
      </div>
    );
  }

  const taggedNotes = sortedNotes.filter((note) => note.tags?.length);
  const untaggedNotes = sortedNotes.filter((note) => !note.tags?.length);

  const CollapsibleSection = ({
    title,
    notes,
    sectionKey,
  }: {
    title: string;
    notes: Note[];
    sectionKey: string;
  }) => {
    const isExpanded = expandedSections[sectionKey] ?? true;

    return (
      <div className="w-full rounded-2xl border border-dashed border-border/30 overflow-hidden backdrop-blur-sm bg-card/20 ">
        <button
          onClick={() => toggleSection(sectionKey)}
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
                onClick={() => router.push(`/note/${note.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-full overflow-hidden space-y-2.5 sm:space-y-3">
      {tagFilter === "all" ? (
        <>
          {taggedNotes.length > 0 && (
            <CollapsibleSection
              title="Tagged Notes"
              notes={taggedNotes}
              sectionKey="tagged"
            />
          )}
          {untaggedNotes.length > 0 && (
            <CollapsibleSection
              title="Untagged Notes"
              notes={untaggedNotes}
              sectionKey="untagged"
            />
          )}
        </>
      ) : (
        <CollapsibleSection
          title={tagFilter === "untagged" ? "Untagged" : `#${tagFilter}`}
          notes={sortedNotes}
          sectionKey={tagFilter}
        />
      )}
    </div>
  );
}
