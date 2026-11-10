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
import { Funnel, ArrowUpDown } from "lucide-react";

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
        <div className="h-9 w-[5.25rem] shrink-0 rounded-full bg-muted animate-pulse sm:h-10 sm:w-auto sm:flex-1" />
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

      <div className="flex h-9 shrink-0 items-center rounded-full border border-input bg-transparent p-0.5 sm:h-10 sm:min-w-0 sm:flex-1 sm:p-1">
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger
            aria-label="Filter by tag"
            title="Filter by tag"
            className="h-full w-9 justify-center gap-0 rounded-full border-0 bg-transparent px-0 shadow-none focus:ring-0 sm:w-auto sm:min-w-0 sm:flex-1 sm:justify-between sm:gap-2 sm:px-2.5 [&>svg]:hidden sm:[&>svg]:block [&>svg]:size-3.5 [&>svg]:opacity-50"
          >
            <span className="flex items-center gap-1.5 min-w-0">
              <Funnel className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden="true" />
              <span className="hidden truncate text-[13px] sm:inline sm:text-sm">
                <SelectValue placeholder="Tags" />
              </span>
            </span>
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
        <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-border/70" />
        <Select
          value={orderBy}
          onValueChange={(v) => setOrderBy(v as "newest" | "oldest")}
        >
          <SelectTrigger
            aria-label="Sort notes"
            title="Sort notes"
            className="h-full w-9 justify-center gap-0 rounded-full border-0 bg-transparent px-0 shadow-none focus:ring-0 sm:w-auto sm:min-w-0 sm:flex-1 sm:justify-between sm:gap-2 sm:px-2.5 [&>svg]:hidden sm:[&>svg]:block [&>svg]:size-3.5 [&>svg]:opacity-50"
          >
            <span className="flex items-center gap-1.5 min-w-0">
              <ArrowUpDown className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden="true" />
              <span className="hidden truncate text-[13px] sm:inline sm:text-sm">
                <SelectValue placeholder="Sort" />
              </span>
            </span>
          </SelectTrigger>
          <SelectContent className="shadow-none">
            <SelectGroup>
              <SelectItem value="newest">Newer first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

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
