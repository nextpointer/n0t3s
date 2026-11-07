"use client";

import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useLayoutEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Note } from "@/lib/types";
import { getNoteTags } from "@/lib/tag-syntax";
import { fuzzyScore } from "@/lib/fuzzy";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useAtomValue, useSetAtom } from "jotai";
import {
  aiEnabledAtom,
  deleteDialogOpenAtom,
  exportDialogOpenAtom,
  zenMode,
  persistZenMode,
} from "@/store/noteAtom";

interface Props {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  notes: Note[];
  /**
   * Id of the note currently open, or null on pages without one. Commands
   * scoped to a note (save, delete, export, zen, AI) are hidden when null,
   * because they act on an open note and would silently do nothing here.
   */
  noteId?: string | null;
}

interface Item {
  id: string;
  label: string;
  shortcut: string;
  kind: "action" | "ai" | "tag" | "note" | "insert";
  tag?: string;
  noteId?: string;
  sub?: string;
  /**
   * Alternative search words — synonyms for what the command does, not
   * what it is called. Typing "light" should reach the theme toggle even
   * though neither word shares a root with "theme".
   */
  keywords?: string;
  /** "note" = only offered while a note is open. */
  scope?: "global" | "note";
}

const COMMANDS: Item[] = [
  { id: "new", label: "New note", shortcut: "", kind: "action", scope: "global", keywords: "create add" },
  { id: "save", label: "Save", shortcut: "⌘S", kind: "action", scope: "note", keywords: "store write disk" },
  { id: "ins:date", label: "Insert current date", shortcut: "", kind: "insert", scope: "note", keywords: "today today's" },
  { id: "ins:time", label: "Insert current time", shortcut: "", kind: "insert", scope: "note", keywords: "clock now" },
  { id: "ins:code", label: "Insert code block", shortcut: "", kind: "insert", scope: "note", keywords: "fence" },
  { id: "ins:hr", label: "Insert horizontal line", shortcut: "", kind: "insert", scope: "note", keywords: "divider separator rule" },
  { id: "ins:link", label: "Insert link", shortcut: "⌘K", kind: "insert", scope: "note", keywords: "hyperlink url" },
  { id: "delete", label: "Delete note", shortcut: "", kind: "action", scope: "note", keywords: "remove trash" },
  { id: "export", label: "Export note", shortcut: "", kind: "action", scope: "note", keywords: "download markdown backup" },
  { id: "help", label: "Help & shortcuts", shortcut: "?", kind: "action", scope: "global", keywords: "manual docs guide" },
  { id: "theme", label: "Toggle theme", shortcut: "", kind: "action", scope: "global", keywords: "light dark appearance mode" },
  { id: "zen", label: "Toggle zen mode", shortcut: "⌘⇧Space", kind: "action", scope: "note", keywords: "focus distraction hide" },
  { id: "readmode", label: "Toggle read mode", shortcut: "⌘/", kind: "action", scope: "note", keywords: "preview render" },
  { id: "ai:summarize", label: "Summarize", shortcut: "⌘⇧S", kind: "ai", scope: "note", keywords: "tldr brief" },
  { id: "ai:rewrite", label: "Rewrite", shortcut: "⌘⇧R", kind: "ai", scope: "note", keywords: "paraphrase rephrase" },
  { id: "ai:grammar", label: "Fix grammar", shortcut: "⌘⇧G", kind: "ai", scope: "note", keywords: "spelling mistakes" },
  { id: "ai:expand", label: "Expand", shortcut: "⌘⇧E", kind: "ai", scope: "note", keywords: "lengthen more" },
  { id: "ai:simplify", label: "Simplify", shortcut: "⌘⇧I", kind: "ai", scope: "note", keywords: "plain easier" },
  { id: "ai:todo", label: "Create todo list", shortcut: "⌘⇧Q", kind: "ai", scope: "note", keywords: "checklist tasks" },
  { id: "ai:prompt", label: "Custom prompt", shortcut: "⌘⇧P", kind: "ai", scope: "note", keywords: "ask question" },
];

function sel(listEl: HTMLDivElement | null, idx: number) {
  if (!listEl) return;
  const prev = listEl.querySelector("[data-sel]");
  if (prev) prev.removeAttribute("data-sel");
  const next = listEl.querySelector(`[data-i="${idx}"]`);
  if (next) {
    next.setAttribute("data-sel", "true");
    next.scrollIntoView({ block: "nearest" });
  }
}

/** Whether the viewport is phone-sized. Client-side only; before
 * hydration (i.e. never, since the palette is closed then) it resolves to
 * the desktop shape, matching the server render. */
function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return isPhone;
}

export const CommandMenu = React.memo(function CommandMenu({
  open,
  setOpen,
  notes,
  noteId = null,
}: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const idxRef = useRef(0);
  const lenRef = useRef(0);
  const router = useRouter();
  const { setTheme } = useTheme();
  const isPhone = useIsPhone();
  const aiEnabled = useAtomValue(aiEnabledAtom);
  const setDeleteOpen = useSetAtom(deleteDialogOpenAtom);
  const setExportOpen = useSetAtom(exportDialogOpenAtom);
  const setZenMode = useSetAtom(zenMode);

  // Global keybind
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "p" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOpen((p) => !p);
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [setOpen]);

  // Focus + body lock on open
  useEffect(() => {
    if (open) {
      setQuery("");
      idxRef.current = 0;
      document.body.style.overflow = "hidden";
      inputRef.current?.focus();
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  // Build items once
  const allItems = useMemo<Item[]>(() => {
    const commands = COMMANDS.filter(
      (c) => (c.scope !== "note" || Boolean(noteId)) &&
        (c.kind !== "ai" || aiEnabled),
    );
    const tagSet = new Set<string>();
    notes.forEach((n) => getNoteTags(n).forEach((t) => tagSet.add(t)));
    const tags = Array.from(tagSet).sort();
    const tagItems: Item[] = tags.map((t) => ({
      id: `tag:${t}`, label: t, shortcut: "", kind: "tag" as const, tag: t,
    }));
    const noteItems: Item[] = [...notes]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((n) => ({
        id: `note:${n.id}`,
        label: n.title || "Untitled",
        shortcut: "",
        kind: "note" as const,
        noteId: n.id,
        sub: n.content?.slice(0, 50).replace(/[#*`\n]/g, " ").trim(),
      }));
    return [...commands, ...tagItems, ...noteItems];
  }, [notes, noteId, aiEnabled]);

  // Filter + rank: every item is scored by the fuzzy matcher against its
  // label (and, where present, its tag and content preview — the preview
  // counts less so running notes never eclipse the commands). With an
  // empty query everything scores 0 and the stable sort keeps the curated
  // order; with a query, best matches rise inside each section.
  const q = query.toLowerCase();
  type Scored = { item: Item; score: number };
  const scoreItem = (item: Item): Scored | null => {
    if (!q) return { item, score: 0 };
    let best: number | null = fuzzyScore(q, item.label);
    // An alias hit reaches a command by meaning ("light" → theme) but a
    // label hit should always outrank it when both exist.
    if (item.keywords) {
      const kwScore = fuzzyScore(q, item.keywords);
      if (kwScore !== null) best = kwScore * 0.75;
    }
    if (item.tag) {
      const tagScore = fuzzyScore(q, item.tag);
      if (tagScore !== null && (best === null || tagScore > best)) best = tagScore;
      const hashScore = fuzzyScore(q, `#${item.tag}`);
      if (hashScore !== null && (best === null || hashScore > best)) best = hashScore;
    }
    if (item.sub) {
      const subScore = fuzzyScore(q, item.sub);
      if (subScore !== null && (best === null || subScore * 0.4 > best)) {
        best = subScore * 0.4;
      }
    }
    return best === null ? null : { item, score: best };
  };
  const commandsMatched: Scored[] = [];
  const tagsMatched: Scored[] = [];
  const notesMatched: Scored[] = [];
  const insertsMatched: Scored[] = [];
  for (const item of allItems) {
    const scored = scoreItem(item);
    if (!scored) continue;
    if (item.kind === "note") notesMatched.push(scored);
    else if (item.kind === "tag") tagsMatched.push(scored);
    else if (item.kind === "insert") insertsMatched.push(scored);
    else commandsMatched.push(scored);
  }
  const byBest = (a: Scored, b: Scored) => b.score - a.score;
  const a = commandsMatched.sort(byBest).map((s) => s.item);
  const t = tagsMatched.sort(byBest).map((s) => s.item);
  const ins = insertsMatched.sort(byBest).map((s) => s.item);
  const n = notesMatched.sort(byBest).map((s) => s.item);
  const sections: { h: string; items: Item[] }[] = [];
  if (a.length) sections.push({ h: "Commands", items: a });
  if (ins.length) sections.push({ h: "Insert", items: ins });
  if (t.length) sections.push({ h: "Tags", items: t });
  if (n.length) sections.push({ h: "Notes", items: n });

  // useLayoutEffect tracks the *ranked* total per render.
  useLayoutEffect(() => {
    lenRef.current = a.length + ins.length + t.length + n.length;
    if (open) sel(listRef.current, idxRef.current);
  });

  // Run action
  const run = useCallback(
    (item: Item) => {
      setOpen(false);
      if (item.kind === "note" && item.noteId) { router.push(`/note/${item.noteId}`); return; }
      if (item.kind === "tag" && item.tag) { router.push(`/?tag=${item.tag}`); return; }
      if (item.id.startsWith("ins:")) {
        // NoteContent owns the insertion so the caret and preview mode
        // handling stay beside the editor it mutates.
        window.dispatchEvent(
          new CustomEvent("note:insert", { detail: item.id.slice(4) }),
        );
        return;
      }
      switch (item.id) {
        case "new": {
          import("@/lib/storage").then(async ({ createNote }) => {
            const note = await createNote();
            router.push(`/note/${note.id}`);
          });
          break;
        }
        case "save": window.dispatchEvent(new CustomEvent("note:save")); break;
        case "delete": setDeleteOpen(true); break;
        case "export": setExportOpen(true); break;
        case "help": router.push("/help"); break;
        case "theme": { const d = document.documentElement.classList.contains("dark"); setTheme(d ? "light" : "dark"); break; }
        case "zen": setZenMode((p) => { const n = !p; persistZenMode(n); return n; }); break;
        case "readmode": window.dispatchEvent(new CustomEvent("note:readmode")); break;
        default: if (item.id.startsWith("ai:")) window.dispatchEvent(new CustomEvent("note:ai", { detail: { action: item.id.replace("ai:", "") } }));
      }
    },
    [router, setOpen, setDeleteOpen, setExportOpen, setZenMode, setTheme],
  );

  // Keyboard — reads lenRef.current, never recreated
  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const len = lenRef.current;
      if (len === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        idxRef.current = (idxRef.current + 1) % len;
        sel(listRef.current, idxRef.current);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        idxRef.current = (idxRef.current - 1 + len) % len;
        sel(listRef.current, idxRef.current);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const el = listRef.current?.querySelector(`[data-i="${idxRef.current}"]`);
        if (el) (el as HTMLElement).click();
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    },
    [setOpen],
  );

  if (!open) return null;

  let gi = -1;

  // One palette body shared by both shapes: the desktop floating card and
  // the phone bottom sheet (radix mounts the sheet's portal; the ref wiring
  // and keyboard handling are identical wherever this renders).
  const body = (
    <>
      {/* Input */}
      <div className="flex items-center gap-3 px-4 h-10 border-b">
        <svg className="size-4 shrink-0 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          ref={inputRef}
          className="flex-1 bg-transparent text-base outline-none sm:text-sm placeholder:text-muted-foreground/50"
          placeholder="Type a command or search..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); idxRef.current = 0; }}
          onKeyDown={onInputKeyDown}
        />
      </div>

      {/* Results */}
      <div ref={listRef} className="max-h-[45svh] md:max-h-[340px] overflow-y-auto overscroll-contain py-1.5">
        {lenRef.current === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground/50">No results</div>
        ) : (
          sections.map((sec) => (
            <div key={sec.h}>
              <div className="px-4 pt-3 pb-1.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40">
                {sec.h}
              </div>
              {sec.items.map((item) => {
                const idx = ++gi;
                return (
                  <div
                    key={item.id}
                    data-i={idx}
                    className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer mx-1 rounded-md data-[sel]:bg-accent data-[sel]:text-accent-foreground"
                    onClick={() => run(item)}
                    onMouseEnter={() => { idxRef.current = idx; sel(listRef.current, idx); }}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{item.label}</span>
                      {item.kind === "tag" && <span className="text-muted-foreground/30 text-xs">#{item.tag}</span>}
                      {item.kind === "note" && item.sub && (
                        <span className="text-muted-foreground/30 text-xs truncate hidden sm:inline">{item.sub}</span>
                      )}
                    </span>
                    <span className="flex items-center gap-2 shrink-0 ml-2">
                      {item.kind === "ai" && <span className="text-[10px] text-muted-foreground/30 font-medium">AI</span>}
                      {item.shortcut && (
                        <kbd className="text-[10px] text-muted-foreground/40 font-mono bg-muted/30 px-1.5 py-0.5 rounded">
                          {item.shortcut}
                        </kbd>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Footer: keyboard hints only mean anything where a keyboard sits. */}
      <div className="hidden md:flex items-center justify-between px-4 py-2 border-t text-[10px] text-muted-foreground/30">
        <span>↑↓</span>
        <span>↵ select</span>
        <span>esc</span>
      </div>
    </>
  );

  // Phones get a bottom sheet (radix dialog under the hood, so Escape,
  // focus trap and backdrop dismissal come for free); everything md+ keeps
  // the floating palette near the top, where the shortcut muscle memory is.
  if (isPhone) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-2xl border-border/60 overflow-hidden p-0 gap-0"
        >
          <div aria-hidden className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-muted-foreground/30" />
          {body}
          {/* Keep clear of the home indicator / gesture bar. */}
          <div aria-hidden className="h-2 shrink-0 pb-[env(safe-area-inset-bottom)]" />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg mx-4 bg-popover text-popover-foreground rounded-lg border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {body}
      </div>
    </div>
  );
});
