"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SolarIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

export type NotesView = "list" | "grid" | "masonry";

function ViewIcon({ view, className }: { view: NotesView; className?: string }) {
  if (view === "list") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden="true">
        <path d="M8 6h13M8 12h13M8 18h13" />
        <circle cx="3.5" cy="6" r="1.25" fill="currentColor" stroke="none" />
        <circle cx="3.5" cy="12" r="1.25" fill="currentColor" stroke="none" />
        <circle cx="3.5" cy="18" r="1.25" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (view === "grid") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="5.5" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="9" rx="1.5" />
      <rect x="3.5" y="12" width="7" height="8.5" rx="1.5" />
      <rect x="13.5" y="15.5" width="7" height="5" rx="1.5" />
    </svg>
  );
}

const VIEW_OPTIONS: { id: NotesView; label: string }[] = [
  { id: "list", label: "List view" },
  { id: "grid", label: "Grid view" },
  { id: "masonry", label: "Masonry view" },
];

type Props = {
  loading: boolean;
  allTags: string[];
  orderBy: "newest" | "oldest";
  setOrderBy: (v: "newest" | "oldest") => void;
  tagFilter: string;
  setTagFilter: (v: string) => void;
  setSearchOpen: (v: boolean) => void;
  view: NotesView;
  setView: (v: NotesView) => void;
};

const NotesFilters = React.memo(function NotesFilters({
  loading,
  allTags,
  orderBy,
  setOrderBy,
  tagFilter,
  setTagFilter,
  setSearchOpen,
  view,
  setView,
}: Props) {
  if (loading)
    return (
      <div className="flex w-full items-center gap-1.5 sm:gap-2">
        <div className="h-9 w-9 shrink-0 rounded-full bg-muted animate-pulse sm:h-10 sm:w-auto sm:flex-1" />
        <div className="h-9 min-w-0 flex-1 rounded-full bg-muted animate-pulse sm:h-10" />
        <div className="h-9 min-w-0 flex-1 rounded-full bg-muted animate-pulse sm:h-10" />
        <div className="h-9 w-[5.75rem] shrink-0 rounded-full bg-muted animate-pulse sm:h-10 sm:w-[7.25rem]" />
      </div>
    );
  return (
    <div className="flex w-full items-center gap-1.5 sm:gap-2">
      <Button
        onClick={() => setSearchOpen(true)}
        variant={"outline"}
        className="h-9 w-9 shrink-0 rounded-full p-0 sm:h-10 sm:w-auto sm:flex-1 sm:px-3"
        aria-label="Search notes"
        title="Search notes"
      >
        <SolarIcon icon="search" className="size-4 shrink-0" />
        <span className="ml-1.5 hidden items-center gap-2 md:flex">
          Search
          <kbd className="rounded-md border border-border/50 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            Ctrl+P
          </kbd>
        </span>
      </Button>

      <Select value={tagFilter} onValueChange={setTagFilter}>
        <SelectTrigger className="h-9 min-w-0 flex-1 rounded-full px-3 text-[13px] sm:h-10 sm:text-sm [&>svg]:size-3.5 [&>svg]:opacity-50">
          <SelectValue placeholder="Tags" />
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
        value={orderBy}
        onValueChange={(v) => setOrderBy(v as "newest" | "oldest")}
      >
        <SelectTrigger className="h-9 min-w-0 flex-1 rounded-full px-3 text-[13px] sm:h-10 sm:text-sm [&>svg]:size-3.5 [&>svg]:opacity-50">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent className="shadow-none">
          <SelectGroup>
            <SelectItem value="newest">Newer first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      <div className="flex h-9 shrink-0 items-center gap-0.5 rounded-full border border-input bg-transparent p-1 sm:h-10" role="group" aria-label="View mode">
        {VIEW_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setView(opt.id)}
            aria-label={opt.label}
            aria-pressed={view === opt.id}
            title={opt.label}
            className={cn(
              "flex h-full w-7 items-center justify-center rounded-full transition-colors sm:w-8",
              view === opt.id
                ? "bg-foreground/[0.09] text-foreground shadow-[0_0_0_1px_rgba(0,0,0,0.03)]"
                : "text-muted-foreground/55 hover:text-foreground",
            )}
          >
            <ViewIcon view={opt.id} className="size-[15px] sm:size-4" />
          </button>
        ))}
      </div>
    </div>
  );
});

export default NotesFilters;
