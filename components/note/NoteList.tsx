"use client";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Note } from "@/lib/types";
import NoteCard from "./NoteCard";
import { ChevronDown } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";
import { createNote } from "@/lib/storage";
import { getNoteTags } from "@/lib/tag-syntax";
import { useVirtualizer } from "@tanstack/react-virtual";

function CollapsibleSection({
  title,
  notes,
  isExpanded,
  onToggle,
  onNoteClick,
  selecting,
  selectedIds,
  onSelect,
}: {
  title: string;
  notes: Note[];
  isExpanded: boolean;
  onToggle: () => void;
  onNoteClick: (id: string) => void;
  selecting: boolean;
  selectedIds: Set<string>;
  onSelect: (id: string, shiftKey: boolean) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const useVirt = notes.length >= 10;

  const virtualizer = useVirtualizer({
    count: notes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
    enabled: useVirt,
  });

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
        <>
          {useVirt ? (
            <div ref={parentRef} className="space-y-1 px-1.5 sm:px-2 pb-1.5 sm:pb-2 max-h-[600px] overflow-auto">
              <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
                {virtualizer.getVirtualItems().map((virtualRow) => (
                  <div
                    key={virtualRow.key}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <NoteCard
                      note={notes[virtualRow.index]}
                      onClick={() => onNoteClick(notes[virtualRow.index].id)}
                      selecting={selecting}
                      selected={selectedIds.has(notes[virtualRow.index].id)}
                      onSelect={onSelect}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1 px-1.5 sm:px-2 pb-1.5 sm:pb-2">
              {notes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onClick={() => onNoteClick(note.id)}
                  selecting={selecting}
                  selected={selectedIds.has(note.id)}
                  onSelect={onSelect}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

type Props = {
  notes: Note[];
  orderBy: "newest" | "oldest";
  tagFilter: string;
  loading: boolean;
  /** Notes the user has ticked for bulk actions, keyed by id. */
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
};

const NotesList = React.memo(function NotesList({
  notes,
  orderBy,
  tagFilter,
  loading,
  selectedIds,
  onSelectionChange,
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

  // Tag mentions live in the note text now; the legacy field rides along
  // until the migration. Extraction is cheap (per note, per render of this
  // list) and the lists are small enough that memoising buys nothing yet.
  const tagsOf = useCallback(
    (note: Note): string[] => getNoteTags(note),
    [],
  );

  const filteredNotes = notes.filter((note) => {
    const noteTags = tagsOf(note);
    if (tagFilter === "all") return true;
    if (tagFilter === "untagged") return noteTags.length === 0;
    return noteTags.includes(tagFilter);
  });

  const pinnedNotes = filteredNotes.filter((note) =>
    tagsOf(note).includes("pin"),
  );
  const nonPinnedNotes = filteredNotes.filter(
    (note) => !tagsOf(note).includes("pin"),
  );

  const sortedNonPinned = nonPinnedNotes.sort((a, b) => {
    if (orderBy === "newest") return b.createdAt - a.createdAt;
    return a.createdAt - b.createdAt;
  });

  const sortedNotes = [...pinnedNotes, ...sortedNonPinned];
  const orderedIds = sortedNotes.map((note) => note.id);
  const selecting = selectedIds.size > 0;

  // Shift-click extends the selection to the whole ordered span between the
  // last touched card and the current one (Notion's anchoring).
  const lastAnchorRef = useRef<string | null>(null);

  const toggleSelect = useCallback(
    (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      lastAnchorRef.current = id;
      onSelectionChange(next);
    },
    [selectedIds, onSelectionChange],
  );

  const rangeSelect = useCallback(
    (id: string) => {
      const anchor = lastAnchorRef.current;
      if (anchor && anchor !== id) {
        const from = orderedIds.indexOf(anchor);
        const to = orderedIds.indexOf(id);
        if (from !== -1 && to !== -1) {
          const next = new Set(selectedIds);
          for (let i = Math.min(from, to); i <= Math.max(from, to); i++) {
            next.add(orderedIds[i]);
          }
          onSelectionChange(next);
          return;
        }
      }
      toggleSelect(id);
    },
    [orderedIds, selectedIds, toggleSelect, onSelectionChange],
  );

  const handleCardSelect = useCallback(
    (id: string, shiftKey: boolean) => {
      if (shiftKey) rangeSelect(id);
      else toggleSelect(id);
    },
    [rangeSelect, toggleSelect],
  );

  // Escape leaves selection mode, matching the same gesture in Notion.
  useEffect(() => {
    if (!selecting) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      lastAnchorRef.current = null;
      onSelectionChange(new Set());
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selecting, onSelectionChange]);

  const navigateToNote = useCallback((id: string) => {
    router.push(`/note/${id}`);
  }, [router]);

  const handleNewNote = useCallback(async () => {
    // Same path as the header button: a blank note that opens on the title.
    const note = await createNote();
    router.push(`/note/${note.id}`);
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

  const taggedNotes = sortedNotes.filter((note) => tagsOf(note).length > 0);
  const untaggedNotes = sortedNotes.filter((note) => tagsOf(note).length === 0);

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
              selecting={selecting}
              selectedIds={selectedIds}
              onSelect={handleCardSelect}
            />
          )}
          {untaggedNotes.length > 0 && (
            <CollapsibleSection
              title="Untagged Notes"
              notes={untaggedNotes}
              isExpanded={expandedSections.untagged ?? true}
              onToggle={() => toggleSection("untagged")}
              onNoteClick={navigateToNote}
              selecting={selecting}
              selectedIds={selectedIds}
              onSelect={handleCardSelect}
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
          selecting={selecting}
          selectedIds={selectedIds}
          onSelect={handleCardSelect}
        />
      )}
    </div>
  );
});

export default NotesList;
