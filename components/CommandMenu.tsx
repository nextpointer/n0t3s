"use client";

import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import React, { Dispatch, SetStateAction, useEffect, useState, useMemo, useCallback } from "react";
import { Note } from "@/lib/types";
import { useRouter } from "next/navigation";
import { EmptyNote } from "./icons/EmptyNote";

interface Props {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  notes: Note[];
}

export const CommandMenu = React.memo(function CommandMenu({ open, setOpen, notes }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  // 1. Add Ctrl+P / Cmd+P Keybind
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "p" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    },
    [setOpen],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // 2. Filter, Reverse, and Apply Counters for duplicate names
  const displayNotes = useMemo(() => {
    // Filter matching notes
    const filtered = notes.filter((note) =>
      (note.title || "Untitled Note")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
    );

    // Reverse the order
    filtered.reverse();

    // Count how many times each title appears to handle duplicates
    const titleCounts: Record<string, number> = {};
    filtered.forEach((note) => {
      const title = note.title || "Untitled Note";
      titleCounts[title] = (titleCounts[title] || 0) + 1;
    });

    const runningCounts: Record<string, number> = {};

    return filtered.map((note) => {
      const title = note.title || "Untitled Note";
      runningCounts[title] = (runningCounts[title] || 0) + 1;

      // If a title appears more than once, add (1), (2), etc.
      const displayTitle =
        titleCounts[title] > 1 ? `${title} (${runningCounts[title]})` : title;

      return { ...note, displayTitle };
    });
  }, [notes, searchTerm]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search notes..."
        value={searchTerm}
        onValueChange={setSearchTerm}
      />
      <CommandList>
        {displayNotes.length === 0 ? (
          <CommandEmpty className="flex flex-col gap-2 p-4 items-center justify-center">
            <EmptyNote className="h-8 w-8" /> No matching notes.
          </CommandEmpty>
        ) : (
          <CommandGroup heading="Notes">
            {displayNotes.map((note) => (
              <CommandItem
                key={note.id}
                // Supplying a unique value prevents CommandItem from multi-selecting identical titles
                value={`${note.displayTitle}-${note.id}`}
                onSelect={() => {
                  setOpen(false);
                  router.push(`/note/${note.id}`);
                }}
              >
                {note.displayTitle}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
});
