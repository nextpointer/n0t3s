"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { allTagsAtom, storageReadyAtom } from "@/store/noteAtom";
import { getNotes, createNote, deleteNote } from "@/lib/storage";
import { getNoteTags } from "@/lib/tag-syntax";
import { Note } from "@/lib/types";
import { ModeToggle } from "@/components/Theme-Mode";
import { Github, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import NotesFilters from "@/components/note/NoteFilters";
import NotesList from "@/components/note/NoteList";
import { CommandMenu } from "@/components/CommandMenu";
import { Button, buttonVariants } from "@/components/ui/button";
import { NewNote } from "@/components/icons/NewNote";
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

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const deleteSelected = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    // Independent deletes: one bad record must not abort the rest.
    await Promise.all(ids.map((id) => deleteNote(id).catch(() => undefined)));
    clearSelection();
    await refreshNotes();
  }, [selectedIds, clearSelection, refreshNotes]);

  const allTags = useMemo(() => {
    return Array.from(new Set(notes.flatMap((note) => getNoteTags(note))));
  }, [notes]);

  const handleNewNote = useCallback(async () => {
    const note = await createNote();
    router.push(`/note/${note.id}`);
  }, [router]);

  const selectedCount = selectedIds.size;

  return (
    <>
      <title>n0t3s</title>
      <div className="w-full h-screen flex flex-col justify-start items-start p-4 pt-8 md:border-l-1 md:border-r-1 md:border-dashed xl:w-5xl">
        {/* Top bar */}
        <div className="flex flex-row justify-end items-center gap-2 md:fixed md:top-0 left-0 w-full md:left-1/2 md:-translate-x-1/2 z-50 md:border-b-1 md:border-dashed sm:p-4 xl:w-5xl">
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
              <Github />
            </Link>
          </Button>
          <Button
            onClick={handleNewNote}
            aria-label="New note"
            title="New note"
          >
            <NewNote className="sm:mr-1 " />{" "}
            <span className="hidden sm:block">New Note</span>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-row w-full gap-2 mt-12 justify-start items-center">
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

        {/* Search command */}
        <CommandMenu open={searchOpen} setOpen={setSearchOpen} notes={notes} noteId={null} />

        {/* Content */}
        <div className="w-full mt-6 overflow-y-scroll overflow-x-hidden py-4">
          <NotesList
            notes={notes}
            orderBy={orderBy}
            tagFilter={tagFilter}
            loading={loading}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        </div>

        {/* Bulk actions bar (Notion-style) — appears only while selecting */}
        {selectedCount > 0 && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 rounded-xl border border-border bg-popover/95 backdrop-blur px-1.5 py-1.5 shadow-lg w-max max-w-[calc(100vw-2rem)]">
            <span className="px-2 text-xs font-medium text-muted-foreground whitespace-nowrap">
              {selectedCount} {selectedCount === 1 ? "note" : "notes"} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              aria-label="Clear selection"
              title="Clear selection (Esc)"
            >
              <X />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 />
                  <span className="hidden sm:block">Delete</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
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
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className={cn(buttonVariants({ variant: "destructive" }))}
                    onClick={() => void deleteSelected()}
                  >
                    Delete {selectedCount === 1 ? "note" : `${selectedCount} notes`}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </>
  );
}
