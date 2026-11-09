"use client";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Note } from "@/lib/types";
import NoteCard from "./NoteCard";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";
import { createNote } from "@/lib/storage";
import { getNoteTags } from "@/lib/tag-syntax";
import { transitionPush } from "@/lib/view-transition";

type Props = {
  notes: Note[];
  orderBy: "newest" | "oldest";
  tagFilter: string;
  loading: boolean;
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

  const tagsCache = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const note of notes) m.set(note.id, getNoteTags(note));
    return m;
  }, [notes]);

  const { sortedNotes, orderedIds } = useMemo(() => {
    const filtered = notes.filter((note) => {
      const noteTags = tagsCache.get(note.id) ?? [];
      if (tagFilter === "all") return true;
      if (tagFilter === "untagged") return noteTags.length === 0;
      return noteTags.includes(tagFilter);
    });
    const pinned: Note[] = [];
    const rest: Note[] = [];
    for (const note of filtered) {
      const t = tagsCache.get(note.id) ?? [];
      if (t.includes("pin")) pinned.push(note);
      else rest.push(note);
    }
    rest.sort((a, b) => (orderBy === "newest" ? b.createdAt - a.createdAt : a.createdAt - b.createdAt));
    const sorted = [...pinned, ...rest];
    return { sortedNotes: sorted, orderedIds: sorted.map((n) => n.id) };
  }, [notes, tagFilter, orderBy, tagsCache]);
  const selecting = selectedIds.size > 0;

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
          for (let i = Math.min(from, to); i <= Math.max(from, to); i++) next.add(orderedIds[i]);
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
    transitionPush(router, `/note/${id}`);
  }, [router]);

  const handleNewNote = useCallback(async () => {
    const note = await createNote();
    transitionPush(router, `/note/${note.id}`);
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: 6 }).map((_, idx) => (
          <Skeleton key={idx} className="w-full h-14 sm:h-16 rounded-xl bg-muted/20" />
        ))}
      </div>
    );
  }

  if (sortedNotes.length === 0) {
    // Notes exist but nothing matches the active filter/tag.
    if (notes.length > 0) {
      return (
        <div className="flex w-full items-center justify-center py-16 text-sm text-muted-foreground/60">
          No notes match this filter.
        </div>
      );
    }
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
          <Button variant="outline" onClick={() => transitionPush(router, "/help")} className="w-auto shadow-none">
            Help : ?
          </Button>
          <Button onClick={handleNewNote} className="w-auto transition-shadow sm:w-auto shadow-primary/20 hover:shadow-primary/40">
            Create new Note : )
          </Button>
        </div>
      </div>
    );
  }

  // Flat list. Note text aligns to the page's content edge (logo/search);
  // the selection tick hangs outside-left in the gutter (scroller padding).
  return (
    <div className="flex w-full max-w-full flex-col gap-0.5">
      {sortedNotes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          onOpen={navigateToNote}
          selecting={selecting}
          selected={selectedIds.has(note.id)}
          onSelect={handleCardSelect}
        />
      ))}
    </div>
  );
});

export default NotesList;
