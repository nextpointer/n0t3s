"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SheetLite } from "@/components/ui/sheet-lite";
import { SolarIcon } from "@/lib/icons";
import { useIsPhone } from "@/hooks/use-is-phone";
import { cn } from "@/lib/utils";

type Props = {
  loading: boolean;
  allTags: string[];
  orderBy: "newest" | "oldest";
  setOrderBy: (v: "newest" | "oldest") => void;
  tagFilter: string;
  setTagFilter: (v: string) => void;
  setSearchOpen: (v: boolean) => void;
};

const NotesFilters = React.memo(function NotesFilters({
  loading,
  allTags,
  orderBy,
  setOrderBy,
  tagFilter,
  setTagFilter,
  setSearchOpen,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const isPhone = useIsPhone();
  const active = tagFilter !== "all" || orderBy !== "newest";

  if (loading) {
    return (
      <>
        <div className="h-10 min-w-0 flex-1 rounded-xl bg-muted animate-pulse" />
        <div className="h-10 w-10 shrink-0 rounded-xl bg-muted animate-pulse" />
      </>
    );
  }

  const filterControls = (
    <div className="flex flex-col gap-3 p-1">
      <div className="flex flex-col gap-1.5">
        <span className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">Tag</span>
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="w-full">
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
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">Sort</span>
        <Select value={orderBy} onValueChange={(v) => setOrderBy(v as "newest" | "oldest")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sort by date" />
          </SelectTrigger>
          <SelectContent className="shadow-none">
            <SelectGroup>
              <SelectItem value="newest">Newer first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      {active && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1 h-8 justify-center rounded-lg text-xs text-muted-foreground"
          onClick={() => {
            setTagFilter("all");
            setOrderBy("newest");
          }}
        >
          Reset filters
        </Button>
      )}
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-input bg-transparent px-3 text-left text-sm text-muted-foreground/70 shadow-none transition-colors hover:bg-accent/40 hover:text-foreground"
        aria-label="Search notes"
      >
        <SolarIcon icon="search" className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">Search notes…</span>
        <kbd className="hidden shrink-0 rounded-md border border-border/50 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
          Ctrl+P
        </kbd>
      </button>

      {isPhone ? (
        <>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label="Filters and sort"
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-input transition-colors hover:bg-accent/40",
              active ? "text-foreground" : "text-muted-foreground/70",
            )}
          >
            <SolarIcon icon="config" className="size-[18px]" />
          </button>
          <SheetLite open={sheetOpen} onClose={() => setSheetOpen(false)} className="pb-2">
            <div className="px-4 pb-1 pt-1 text-sm font-medium text-foreground/80">Filters</div>
            <div className="px-3">{filterControls}</div>
          </SheetLite>
        </>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Filters and sort"
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-input transition-colors hover:bg-accent/40",
                active ? "text-foreground" : "text-muted-foreground/70",
              )}
            >
              <SolarIcon icon="config" className="size-[18px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} collisionPadding={12} className="w-64 rounded-xl p-2 shadow-lg">
            {filterControls}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
});

export default NotesFilters;
