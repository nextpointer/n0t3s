import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

type Props = {
  loading: boolean;
  allTags: string[];
  orderBy: "newest" | "oldest";
  setOrderBy: (v: "newest" | "oldest") => void;
  tagFilter: string;
  setTagFilter: (v: string) => void;
  setSearchOpen: (v: boolean) => void;
};

export default function NotesFilters({
  loading,
  allTags,
  orderBy,
  setOrderBy,
  tagFilter,
  setTagFilter,
  setSearchOpen,
}: Props) {
  if (loading)
    return (
      <>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-8 md:h-10 rounded-xl bg-muted animate-pulse"
          />
        ))}
      </>
    );
  return (
    <>
      <Button
        onClick={() => setSearchOpen(true)}
        variant={"outline"}
        className="flex-1"
      >
        <Search />
        <span className="hidden sm:flex items-center gap-2">
          Search
          <kbd className="px-2 py-0.5 bg-muted/60 rounded-md text-[10px] font-mono text-muted-foreground border border-border/50">
            Ctrl+P
          </kbd>
        </span>
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
        value={orderBy}
        onValueChange={(v) => setOrderBy(v as "newest" | "oldest")}
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
  );
}
