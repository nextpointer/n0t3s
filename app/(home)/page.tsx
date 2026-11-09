"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { allTagsAtom, storageReadyAtom } from "@/store/noteAtom";
import { getNotes, createNote, deleteNote } from "@/lib/storage";
import { getNoteTags } from "@/lib/tag-syntax";
import { Note } from "@/lib/types";
import { ModeToggle } from "@/components/Theme-Mode";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import NotesFilters, { type NotesView } from "@/components/note/NoteFilters";
import NotesList from "@/components/note/NoteList";
import { CommandMenu } from "@/components/CommandMenu";
import { Button, buttonVariants } from "@/components/ui/button";
import { SolarIcon } from "@/lib/icons";
import { transitionPush } from "@/lib/view-transition";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsPhone } from "@/hooks/use-is-phone";
import { cn } from "@/lib/utils";

export default function Home() {
  const router = useRouter();
  const setAllTags = useSetAtom(allTagsAtom);
  const isPhone = useIsPhone();
  // The list may render the content the tag migration is writing, so wait
  // for boot-time storage maintenance.
  const storageReady = useAtomValue(storageReadyAtom);

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [orderBy, setOrderBy] = useState<"newest" | "oldest">("newest");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [view, setView] = useState<NotesView>("list");
  const [searchOpen, setSearchOpen] = useState<boolean>(false);

  // Bulk selection (Notion-style): an empty set means normal browsing; any
  // entry turns the list into selection mode.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const listScrollRef = useRef<HTMLDivElement | null>(null);

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
    const results = await Promise.all(ids.map((id) => deleteNote(id).then(() => true).catch(() => false)));
    const failed = results.filter((ok) => !ok).length;
    if (failed > 0) toast.error(`Couldn't delete ${failed} note${failed > 1 ? "s" : ""}`);
    setSelectedIds(new Set());
    await refreshNotes();
  }, [selectedIds, refreshNotes]);

  const allTags = useMemo(() => {
    return Array.from(new Set(notes.flatMap((note) => getNoteTags(note))));
  }, [notes]);

  const handleNewNote = useCallback(async () => {
    const note = await createNote();
    transitionPush(router, `/note/${note.id}`);
  }, [router]);

  const handleNewTempNote = useCallback(async () => {
    const note = await createNote("", { temp: true });
    transitionPush(router, `/note/${note.id}`);
  }, [router]);

  // Phone: hold the create button to create a temp note.
  const createHoldRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const createLongPressRef = useRef(false);
  const clearCreateHold = useCallback(() => {
    if (createHoldRef.current) {
      clearTimeout(createHoldRef.current);
      createHoldRef.current = null;
    }
  }, []);
  useEffect(() => clearCreateHold, [clearCreateHold]);

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
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4 pb-2 pt-5 sm:px-6 sm:pt-8">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">N0T3S</h1>
            <div className="flex items-center gap-2">
              <ModeToggle />
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-xl"
                asChild
                aria-label="Project on GitHub"
                title="Project on GitHub"
              >
                <Link
                  href="https://github.com/nextpointer/n0t3s?tab=readme-ov-file#-n0t3s"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <SolarIcon icon="github" className="size-4" />
                </Link>
              </Button>
              {isPhone ? (
                <Button
                  onClick={() => {
                    if (createLongPressRef.current) {
                      createLongPressRef.current = false;
                      return;
                    }
                    void handleNewNote();
                  }}
                  onPointerDown={(e) => {
                    if (e.pointerType !== "touch") return;
                    clearCreateHold();
                    createLongPressRef.current = false;
                    createHoldRef.current = setTimeout(() => {
                      createHoldRef.current = null;
                      createLongPressRef.current = true;
                      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                        try {
                          navigator.vibrate(12);
                        } catch {
                          /* noop */
                        }
                      }
                      void handleNewTempNote();
                    }, 450);
                  }}
                  onPointerUp={clearCreateHold}
                  onPointerCancel={clearCreateHold}
                  onPointerLeave={clearCreateHold}
                  onContextMenu={(e) => {
                    if (createLongPressRef.current || createHoldRef.current) e.preventDefault();
                  }}
                  className="h-9 rounded-xl px-3"
                  aria-label="New note (hold for temp note)"
                  title="New note (hold for temp note)"
                  style={{ WebkitTouchCallout: "none" }}
                >
                  <SolarIcon icon="add" className="size-4" />
                </Button>
              ) : (
                <div className="flex items-center">
                  <Button
                    onClick={handleNewNote}
                    className="h-9 rounded-l-xl rounded-r-none px-3 sm:px-4"
                    aria-label="New note"
                    title="New note"
                  >
                    <SolarIcon icon="add" className="size-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">New Note</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="default"
                        className="h-9 rounded-l-none rounded-r-xl border-l border-primary-foreground/20 px-2"
                        aria-label="More note options"
                        title="More note options"
                      >
                        <SolarIcon icon="chevronDown" className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={6} collisionPadding={12} className="rounded-xl">
                      <DropdownMenuItem onSelect={() => void handleNewTempNote()} className="gap-2 rounded-lg">
                        <SolarIcon icon="temp" className="size-4 text-muted-foreground/70" />
                        New temp note
                        <span className="ml-auto text-[10px] text-muted-foreground/60">24h</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </div>

          {/* Search + filters */}
          {!loading && notes.length > 0 && (
            <div className="mt-8 flex w-full shrink-0 items-center gap-2 sm:mt-12">
              <NotesFilters
                loading={loading}
                allTags={allTags}
                orderBy={orderBy}
                setOrderBy={setOrderBy}
                tagFilter={tagFilter}
                setTagFilter={setTagFilter}
                setSearchOpen={setSearchOpen}
                view={view}
                setView={setView}
              />
            </div>
          )}
          {(loading || notes.length === 0) && (
            <div className="mt-8 sm:mt-12" />
          )}

          <CommandMenu open={searchOpen} setOpen={setSearchOpen} notes={notes} noteId={null} />

          {/* Notes list */}
          <div
            ref={listScrollRef}
            className={cn(
              "min-h-0 flex-1 overflow-y-auto -mx-4 px-0 sm:mx-0 sm:px-0",
              !loading && notes.length > 0 ? "mt-4" : "mt-2",
            )}
          >
            <NotesList
              notes={notes}
              orderBy={orderBy}
              tagFilter={tagFilter}
              loading={loading}
              view={view}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              scrollRef={listScrollRef}
            />
          </div>
        </div>

        {/* Bulk actions */}
        {selectedCount > 0 && (
          <div
            className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto flex w-auto max-w-md items-center justify-between gap-2 rounded-2xl border border-border/60 bg-popover px-3 py-2.5 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-200 sm:inset-x-auto sm:left-1/2 sm:w-max sm:max-w-[calc(100vw-2rem)] sm:-translate-x-1/2 sm:justify-start sm:px-3"
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
              <Button variant="ghost" size="icon" className="size-8 rounded-xl text-muted-foreground hover:text-foreground" onClick={selectAllVisible} aria-label="Select all" title="Select all">
                <SolarIcon icon="selectAll" className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="size-8 rounded-xl text-muted-foreground hover:text-foreground" onClick={selectNone} aria-label="Select none" title="Select none">
                <SolarIcon icon="selectNone" className="size-4" />
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
