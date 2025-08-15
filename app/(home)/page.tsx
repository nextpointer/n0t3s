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
import { Github, NotebookPen, Search } from "lucide-react";
import Link from "next/link";
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

  // Separate pinned notes (those with "pin" tag)
  const pinnedNotes = filteredNotes.filter((note) =>
    note.tags?.includes("pin"),
  );
  const nonPinnedNotes = filteredNotes.filter(
    (note) => !note.tags?.includes("pin"),
  );

  // Sort non-pinned notes properly
  const sortedNonPinnedNotes = [...nonPinnedNotes].sort((a, b) => {
    if (orderbyDate === "newest") {
      return b.createdAt - a.createdAt;
    } else {
      return a.createdAt - b.createdAt;
    }
  });

  // Combine pinned notes (always first) with sorted non-pinned notes
  const sortedNotes = [...pinnedNotes, ...sortedNonPinnedNotes];

  // Separate tagged and untagged notes (including pinned notes in tagged)
  const taggedNotes = sortedNotes.filter(
    (note) => note.tags && note.tags.length > 0,
  );
  const untaggedNotes = sortedNotes.filter(
    (note) => !note.tags || note.tags.length === 0,
  );

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
            <Link
              href="https://github.com/nextpointer"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
            >
              <Github />
            </Link>
          </Button>
          <Button onClick={handleNewNote}>
            <NotebookPen className="sm:mr-1 " />{" "}
            <span className="hidden sm:block">New Note</span>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-row w-full gap-2 mt-12 justify-start items-center">
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
                <SelectContent className="shadow-none">
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
                <SelectContent className="shadow-none">
                  <SelectGroup>
                    <SelectItem value="newest">Newer first</SelectItem>
                    <SelectItem value="oldest">Oldest first</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        {/* Search command */}
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
          ) : sortedNotes.length === 0 ? (
            <div className="w-full text-center mt-16 text-border">
              No notes available.
            </div>
          ) : (
            <div className="space-y-6">
              {tagFilter === "all" ? (
                <>
                  {/* Tagged notes section (now includes pinned notes at top) */}
                  {taggedNotes.length > 0 && (
                    <div className="mt-6 w-full p-2 pl-8 border-l border-border rounded-xl relative">
                      <h2 className="text-sm text-muted mb-2 relative left-0 -top-5 bg-muted-foreground inline-block py-1 px-3 rounded-2xl">
                        Tagged Notes
                      </h2>
                      <div className="space-y-2 text-sm">
                        {taggedNotes.map((note) => {
                          const hasMultipleTags =
                            note.tags && note.tags.length > 1;
                          const isPinned = note.tags?.includes("pin");
                          const maxTagsToShow = 1;

                          return (
                            <div
                              key={note.id}
                              onClick={() => router.push(`/note/${note.id}`)}
                              className="relative cursor-pointer p-3 bg-muted hover:bg-border flex flex-col rounded-xl gap-1"
                            >
                              {/* Stack effect lines */}
                              {hasMultipleTags && (
                                <div className="absolute -left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5">
                                  {note.tags?.slice(0, 3).map((_, i) => (
                                    <div
                                      key={i}
                                      className="w-4 h-[1px] bg-border"
                                    ></div>
                                  ))}
                                </div>
                              )}

                              <div className="flex flex-wrap gap-1 items-center">
                                {isPinned && (
                                  <span className="text-xs bg-blue-500 text-background px-2 py-0.5 rounded-full">
                                    pin
                                  </span>
                                )}
                                {note.tags
                                  ?.filter((tag) => tag !== "pin")
                                  .slice(0, maxTagsToShow)
                                  .map((tag) => (
                                    <span
                                      key={tag}
                                      className="text-xs bg-muted-foreground text-background px-2 py-0.5 rounded-full"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                {note.tags &&
                                  note.tags.filter((tag) => tag !== "pin")
                                    .length > maxTagsToShow && (
                                    <span className="text-xs text-zinc-400">
                                      ...
                                    </span>
                                  )}
                              </div>
                              <h3 className="font-medium mt-2">{note.title}</h3>
                              <p className="text-xs text-zinc-400 self-end">
                                {new Date(note.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Untagged notes section */}
                  {untaggedNotes.length > 0 && (
                    <div className="mt-6 w-full p-2 pl-8 border-l border-border rounded-xl relative">
                      <h2 className="text-sm text-muted mb-2 relative left-0 -top-5 bg-muted-foreground inline-block py-1 px-3 rounded-2xl">
                        Untagged Notes
                      </h2>
                      <div className="space-y-2 text-sm">
                        {untaggedNotes.map((note) => (
                          <div
                            key={note.id}
                            onClick={() => router.push(`/note/${note.id}`)}
                            className="relative cursor-pointer p-3 bg-muted hover:bg-border flex flex-row justify-between items-center rounded-xl gap-1 before:content-[''] before:absolute before:-left-6 before:top-1/2 before:-translate-y-1/2 before:h-[1px] before:w-4 before:bg-border before:rounded"
                          >
                            <h3 className="font-medium">{note.title}</h3>
                            <p className="text-xs text-zinc-400 ">
                              {new Date(note.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                // Show filtered notes (single tag or untagged)
                <div className="mt-6 w-full p-2 pl-8 border-l border-border rounded-xl relative">
                  <h2 className="text-sm text-muted mb-2 relative left-0 -top-5 bg-muted-foreground inline-block py-1 px-3 rounded-2xl">
                    {tagFilter === "untagged" ? "Untagged" : `#${tagFilter}`}
                  </h2>
                  <div className="space-y-2 text-sm">
                    {sortedNotes.map((note) => (
                      <div
                        key={note.id}
                        onClick={() => router.push(`/note/${note.id}`)}
                        className="relative cursor-pointer p-3 bg-muted hover:bg-border flex flex-col rounded-xl gap-1 before:content-[''] before:absolute before:-left-6 before:top-1/2 before:-translate-y-1/2 before:h-[1px] before:w-4 before:bg-border before:rounded"
                      >
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {note.tags.map((tag) => (
                              <span
                                key={tag}
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  tag === "pin"
                                    ? "bg-blue-500 text-background"
                                    : "bg-muted-foreground text-background"
                                }`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <h3 className="font-medium mt-2">{note.title}</h3>
                        <p className="text-xs text-zinc-400 self-end">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
