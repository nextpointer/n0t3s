"use client";

import { CommandMenu } from "@/components/CommandMenu";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { addNote, getNotes } from "@/lib/storage";
import { Note } from "@/lib/types";
import { Github, Loader2, NotebookPen, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [orderbyDate, setOrderbyDate] = useState<"newest" | "oldest">("newest");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [searchOpen, setSearchopen] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    const allNotes = getNotes();
    setNotes(allNotes);
    setLoading(false);
  }, []);

  const allTags = Array.from(new Set(notes.flatMap((note) => note.tags || [])));

  // Filter notes based on selected tag
  const filteredNotes = notes.filter((note) => {
    if (tagFilter === "all") return true;
    if (tagFilter === "untagged") return !note.tags || note.tags.length === 0;
    return note.tags?.includes(tagFilter);
  });

  // Sort filtered notes
  filteredNotes.sort((a, b) =>
    orderbyDate === "newest"
      ? b.createdAt - a.createdAt
      : a.createdAt - b.createdAt,
  );

  // Group filtered notes by tags
  const notesByTag: Record<string, Note[]> = {};

  filteredNotes.forEach((note) => {
    const tags = note.tags && note.tags.length > 0 ? note.tags : ["_untagged"];
    tags.forEach((tag) => {
      if (!notesByTag[tag]) notesByTag[tag] = [];
      notesByTag[tag].push(note);
    });
  });

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

  return (
    <>
      <title>Next Notes</title>
      <div className="w-full md:w-2xl h-screen flex flex-col justify-start items-start p-4 pt-8">
        {/* Top bar */}
        <div className="flex flex-row justify-end items-center w-full gap-2">
          <h1 className="mr-auto text-2xl font-semibold">N0T3S</h1>
          <Button variant={"outline"}>
            <Github />
          </Button>
          <Button onClick={handleNewNote}>
            <NotebookPen className="sm:mr-1 " />{" "}
            <span className="hidden sm:block">New Note</span>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-row w-full gap-2 mt-12 justify-start items-center">
          {/*seach*/}
          {loading ? (
            <>
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton className="flex-1 h-12 rounded-xl" key={index} />
              ))}
            </>
          ) : (
            <>
              <Button
                onClick={() => setSearchopen(true)}
                variant={"outline"}
                className="flex-1"
              >
                <Search />
                <span className="hidden sm:block ">Click to search</span>
              </Button>

              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="min-w-[130px] flex-1">
                  <SelectValue placeholder="Filter by tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tags</SelectItem>
                  <SelectItem value="untagged">Untagged</SelectItem>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={orderbyDate}
                onValueChange={(value) =>
                  setOrderbyDate(value as "newest" | "oldest")
                }
              >
                <SelectTrigger className="min-w-[130px] flex-1">
                  <SelectValue placeholder="Sort by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="newest">Newer first</SelectItem>
                    <SelectItem value="oldest">Oldest first</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </>
          )}
        </div>
        {/*seatch command*/}
        <CommandMenu open={searchOpen} setOpen={setSearchopen} notes={notes} />

        {/* Content */}
        <div className="w-full mt-6 overflow-y-scroll">
          {loading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index}>
                  <Skeleton className="w-full h-36 rounded-xl" />
                </div>
              ))}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="w-full text-center mt-16 text-gray-500">
              No notes available.
            </div>
          ) : (
            Object.entries(notesByTag).map(([tag, notes]) => {
              // Only render the selected tag group or all if "all"
              if (
                tagFilter === "all" ||
                (tagFilter === "untagged" && tag === "_untagged") ||
                tag === tagFilter
              ) {
                return (
                  <div
                    key={tag}
                    className="mt-6 w-full p-2 pl-8 border-l border-border rounded-xl relative"
                  >
                    <h2 className="text-sm text-muted mb-2 relative left-0 -top-5 bg-muted-foreground inline-block py-1 px-3 rounded-2xl">
                      {tag === "_untagged" ? "Untagged" : `#${tag}`}
                    </h2>
                    <div className="space-y-2 text-sm">
                      {notes.map((note) => (
                        <div
                          key={note.id}
                          onClick={() => router.push(`/note/${note.id}`)}
                          className="relative cursor-pointer p-3 hover:bg-muted flex flex-row justify-between items-center rounded-xl gap-6 before:content-[''] before:absolute before:-left-6 before:top-1/2 before:-translate-y-1/2 before:h-[1px] before:w-4 before:bg-border before:rounded"
                        >
                          <h3 className="font-medium">{note.title}</h3>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(note.createdAt)
                              .toLocaleString()
                              .slice(0, 10)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })
          )}
        </div>
      </div>
    </>
  );
}
