"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSetAtom } from "jotai";
import { allTagsAtom } from "@/store/noteAtom";
import { getNotes, addNote } from "@/lib/storage";
import { Note } from "@/lib/types";
import { ModeToggle } from "@/components/Theme-Mode";
import { Github } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import NotesFilters from "@/components/note/NoteFilters";
import NotesList from "@/components/note/NoteList";
import { CommandMenu } from "@/components/CommandMenu";
import { Button } from "@/components/ui/button";
import { NewNote } from "@/components/icons/NewNote";

export default function Home() {
  const router = useRouter();
  const setAllTags = useSetAtom(allTagsAtom);

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [orderBy, setOrderBy] = useState<"newest" | "oldest">("newest");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [searchOpen, setSearchOpen] = useState<boolean>(false);

  // Initial load
  useEffect(() => {
    setLoading(true);
    const allNotes = getNotes();
    setNotes(allNotes);
    setLoading(false);

    // Collect all tags for filter dropdown
    const tags = Array.from(
      new Set(allNotes.flatMap((note) => note.tags || [])),
    );
    setAllTags(tags);
  }, [setAllTags]);

  const allTags = useMemo(() => {
    return Array.from(new Set(notes.flatMap((note) => note.tags || [])));
  }, [notes]);

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

  return (
    <>
      <title>n0t3s</title>
      <div className="md:w-3xl w-full h-screen flex flex-col justify-start items-start p-4 pt-8 md:border-l-1 md:border-r-1 md:border-dashed">
        {/* Top bar */}
        <div className="flex flex-row justify-end items-center gap-2 md:fixed md:top-0 left-0 w-full  md:w-3xl md:left-1/2 md:-translate-x-1/2 z-50 md:border-b-1 md:border-dashed sm:p-4">
          <h1 className="mr-auto text-2xl font-semibold">N0T3S</h1>
          <ModeToggle />
          <Button variant={"outline"} className="p-3">
            <Link
              href="https://github.com/nextpointer/n0t3s?tab=readme-ov-file#-n0t3s"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center m-0 p-0"
            >
              <Github />
            </Link>
          </Button>
          <Button onClick={handleNewNote}>
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
        <CommandMenu open={searchOpen} setOpen={setSearchOpen} notes={notes} />

        {/* Content */}
        <div className="w-full mt-6 overflow-y-scroll overflow-x-hidden px-4 py-4">
          <NotesList
            notes={notes}
            orderBy={orderBy}
            tagFilter={tagFilter}
            loading={loading}
          />
        </div>
      </div>
    </>
  );
}
