"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { allTagsAtom, storageReadyAtom } from "@/store/noteAtom";
import { getNotes, createNote, deleteNote } from "@/lib/storage";
import { getNoteTags } from "@/lib/tag-syntax";
import { Note } from "@/lib/types";
import { ModeToggle } from "@/components/Theme-Mode";
import Link from "next/link";
import { useRouter } from "next/navigation";

import NotesFilters from "@/components/note/NoteFilters";
import NotesList from "@/components/note/NoteList";
import { CommandMenu } from "@/components/CommandMenu";
import { Button, buttonVariants } from "@/components/ui/button";
import { SolarIcon } from "@/lib/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export default function Home() {
  const router = useRouter();
  const setAllTags = useSetAtom(allTagsAtom);
  // The list may render the content the tag migration is writing, so wait
  // for boot-time storage maintenance.
  const storageReady = useAtomValue(storageReadyAtom);

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [orderBy, setOrderBy] = useState<"newest" | "oldest">("newest");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [searchOpen, setSearchOpen] = useState<boolean>(false);

  // Bulk selection (Notion-style): an empty set means normal browsing; any
  // entry turns the list into selection mode.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Single source of truth for re-reading the store, so the tag aggregation
  // after a delete matches the initial load exactly.
  const refreshNotes = useCallback(async () => {
    const allNotes = await getNotes();
    setNotes(allNotes);
    setLoading(false);
    setAllTags(
      Array.from(new Set(allNotes.flatMap((note) => getNoteTags(note)))),
    );
  }, [setAllTags]);

  // Initial load
  useEffect(() => {
    if (!storageReady) return;
    setLoading(true);
    void refreshNotes();
  }, [refreshNotes, storageReady]);

  const deleteSelected = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await Promise.all(ids.map((id) => deleteNote(id).catch(() => undefined)));
    setSelectedIds(new Set());
    await refreshNotes();
  }, [selectedIds, refreshNotes]);

  const allTags = useMemo(() => {
    return Array.from(new Set(notes.flatMap((note) => getNoteTags(note))));
  }, [notes]);

  const handleNewNote = useCallback(async () => {
    const note = await createNote();
    router.push(`/note/${note.id}`);
  }, [router]);

  const selectedCount = selectedIds.size;

  const visibleIds = useMemo(() => {
    const tagsOf = (note: Note) => getNoteTags(note);
    const filtered = notes.filter((note) => {
      const t = tagsOf(note);
      if (tagFilter === "all") return true;
      if (tagFilter === "untagged") return t.length === 0;
      return t.includes(tagFilter);
    });
    const pinned = filtered.filter((n) => tagsOf(n).includes("pin"));
    const rest = filtered
      .filter((n) => !tagsOf(n).includes("pin"))
      .sort((a, b) => (orderBy === "newest" ? b.createdAt - a.createdAt : a.createdAt - b.createdAt));
    return [...pinned, ...rest].map((n) => n.id);
  }, [notes, tagFilter, orderBy]);

  const selectAllVisible = useCallback(() => setSelectedIds(new Set(visibleIds)), [visibleIds]);
  const selectNone = useCallback(() => setSelectedIds(new Set()), []);

  return (
    <>
      <title>n0t3s</title>
      <div className="md:w-3xl w-full h-screen flex flex-col justify-start items-start p-4 pt-8">
        {/* Top bar */}
        <div className="flex flex-row justify-end items-center gap-2 md:fixed md:top-0 left-0 w-full  md:w-3xl md:left-1/2 md:-translate-x-1/2 z-50 sm:p-4">
          <h1 className="mr-auto text-2xl font-semibold">N0T3S</h1>
          <ModeToggle />
          <Button
            variant={"outline"}
            className="p-3"
            asChild
            aria-label="Project on GitHub"
            title="Project on GitHub"
          >
            <Link
              href="https://github.com/nextpointer/n0t3s?tab=readme-ov-file#-n0t3s"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center m-0 p-0"
            >
              <SolarIcon icon="github" className="size-4" />
            </Link>
          </Button>
          <Button
            onClick={handleNewNote}
            aria-label="New note"
            title="New note"
          >
            <SolarIcon icon="add" className="size-4 sm:mr-1" />
            <span className="hidden sm:block">New Note</span>
          </Button>
        </div>

        {/* Filters — hidden on a fresh/empty library */}
        {!loading && notes.length > 0 && (
          <div className="flex flex-row w-full gap-2 mt-4 md:mt-12 justify-start items-center">
            <NotesFilters
              loading={loading}
              allTags={allTags}
              orderBy={orderBy}
              setOrderBy={setOrderBy}
              tagFilter={tagFilter}
              setTagFilter={setTagFilter}
              setSearchOpen={setSearchOpen}
            />
          </div>
        )}

        {/* Search command */}
        <CommandMenu open={searchOpen} setOpen={setSearchOpen} notes={notes} noteId={null} />

        {/* Content: gutter lets the tick hang outside-left while note text
            aligns to the logo/search edge (scroller padding edge). */}
        <div className={cn("w-full overflow-y-auto py-2 pl-6 -ml-4", !loading && notes.length > 0 ? "mt-4" : "mt-6")}>
          <NotesList
            notes={notes}
            orderBy={orderBy}
            tagFilter={tagFilter}
            loading={loading}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        </div>

        {/* Bulk actions — bottom popup on phone, floating pill on desktop */}
        {selectedCount > 0 && (
          <div
            className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto flex w-auto max-w-md items-center justify-between gap-2 rounded-2xl border border-border/60 bg-popover/95 px-3 py-2.5 shadow-lg backdrop-blur animate-in fade-in slide-in-from-bottom-4 duration-200 sm:inset-x-auto sm:left-1/2 sm:w-max sm:max-w-[calc(100vw-2rem)] sm:-translate-x-1/2 sm:justify-start sm:px-3"
            role="region"
            aria-label="Bulk actions"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/12 px-1.5 text-[11px] font-semibold text-primary tabular-nums">
                {selectedCount}
              </span>
              <span className="text-xs font-medium text-foreground/80 whitespace-nowrap">selected</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-8 rounded-xl px-2.5 text-xs text-muted-foreground hover:text-foreground" onClick={selectAllVisible}>
                All
              </Button>
              <Button variant="ghost" size="sm" className="h-8 rounded-xl px-2.5 text-xs text-muted-foreground hover:text-foreground" onClick={selectNone}>
                None
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="h-8 rounded-xl px-3 text-xs">
                    <SolarIcon icon="delete" className="size-3.5 mr-1" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Permanently delete{" "}
                      {selectedCount === 1 ? "1 note" : `${selectedCount} notes`}
                      ?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes them from this device&apos;s storage — the
                      notes and their &quot;#&quot;tags are gone for good and
                      cannot be recovered.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className={cn(buttonVariants({ variant: "destructive" }), "rounded-xl")}
                      onClick={() => void deleteSelected()}
                    >
                      Delete {selectedCount === 1 ? "note" : `${selectedCount} notes`}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
