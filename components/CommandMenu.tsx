"use client";

import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Dispatch, SetStateAction, useState } from "react";
import { Note } from "@/lib/types";
import { useRouter } from "next/navigation";
import { EmptyNote } from "./icons/EmptyNote";

interface Props {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  notes: Note[];
}

export function CommandMenu({ open, setOpen, notes }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search notes..."
        value={searchTerm}
        onValueChange={setSearchTerm}
      />
      <CommandList>
        {filteredNotes.length === 0 ? (
          <CommandEmpty className="flex flex-col gap-2 p-4 items-center justify-center">
            {" "}
            <EmptyNote className="h-8 w-8" /> No matching notes.
          </CommandEmpty>
        ) : (
          <CommandGroup heading="Notes">
            {filteredNotes.map((note) => (
              <CommandItem
                key={note.id}
                onSelect={() => {
                  setOpen(false);
                  router.push(`/note/${note.id}`);
                }}
              >
                {note.title || "Untitled Note"}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
