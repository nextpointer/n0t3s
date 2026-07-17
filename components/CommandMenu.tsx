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
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useSetAtom } from "jotai";
import {
  deleteDialogOpenAtom,
  exportDialogOpenAtom,
  zenMode,
  persistZenMode,
} from "@/store/noteAtom";

interface Props {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  notes: Note[];
}

interface Item {
  id: string;
  label: string;
  shortcut: string;
  kind: "action" | "ai" | "tag" | "note";
  tag?: string;
  noteId?: string;
  sub?: string;
}

const COMMANDS: Item[] = [
  { id: "new", label: "New note", shortcut: "", kind: "action" },
  { id: "save", label: "Save", shortcut: "⌘S", kind: "action" },
  { id: "delete", label: "Delete note", shortcut: "", kind: "action" },
  { id: "export", label: "Export note", shortcut: "", kind: "action" },
  { id: "help", label: "Help & shortcuts", shortcut: "?", kind: "action" },
  { id: "theme", label: "Toggle dark mode", shortcut: "", kind: "action" },
  { id: "zen", label: "Toggle zen mode", shortcut: "⌘⇧Z", kind: "action" },
  { id: "ai:summarize", label: "Summarize", shortcut: "⌘⇧S", kind: "ai" },
  { id: "ai:rewrite", label: "Rewrite", shortcut: "⌘⇧R", kind: "ai" },
  { id: "ai:grammar", label: "Fix grammar", shortcut: "⌘⇧G", kind: "ai" },
  { id: "ai:expand", label: "Expand", shortcut: "⌘⇧E", kind: "ai" },
  { id: "ai:simplify", label: "Simplify", shortcut: "⌘⇧I", kind: "ai" },
  { id: "ai:todo", label: "Create todo list", shortcut: "⌘⇧Q", kind: "ai" },
  { id: "ai:prompt", label: "Custom prompt", shortcut: "⌘⇧P", kind: "ai" },
];

function match(q: string, t: string): boolean {
  if (!q) return true;
  return t.toLowerCase().includes(q.toLowerCase());
}

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

export const CommandMenu = React.memo(function CommandMenu({
  open,
  setOpen,
  notes,
}: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const idxRef = useRef(0);
  const lenRef = useRef(0);
  const router = useRouter();
  const { setTheme } = useTheme();
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
    const tagSet = new Set<string>();
    notes.forEach((n) => (n.tags || []).forEach((t) => tagSet.add(t)));
    const tags = Array.from(tagSet).sort();
    const tagItems: Item[] = tags.map((t) => ({
      id: `tag:${t}`, label: t, shortcut: "", kind: "tag" as const, tag: t,
    }));
    const noteItems: Item[] = notes
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((n) => ({
        id: `note:${n.id}`,
        label: n.title || "Untitled",
        shortcut: "",
        kind: "note" as const,
        noteId: n.id,
        sub: n.content?.slice(0, 50).replace(/[#*`\n]/g, " ").trim(),
      }));
    return [...COMMANDS, ...tagItems, ...noteItems];
  }, [notes]);

  // Filter
  const q = query.toLowerCase();
  const sections: { h: string; items: Item[] }[] = [];
  const a: Item[] = [], t: Item[] = [], n: Item[] = [];
  for (const i of allItems) {
    if (!q || match(q, i.label) || match(q, i.tag || "") || match(q, i.sub || "")) {
      if (i.kind === "note") n.push(i);
      else if (i.kind === "tag") t.push(i);
      else a.push(i);
    }
  }
  if (a.length) sections.push({ h: "Commands", items: a });
  if (t.length) sections.push({ h: "Tags", items: t });
  if (n.length) sections.push({ h: "Notes", items: n });

  // Sync lenRef + highlight after render (not during)
  useLayoutEffect(() => {
    lenRef.current = a.length + t.length + n.length;
    if (open) sel(listRef.current, idxRef.current);
  });

  // Run action
  const run = useCallback(
    (item: Item) => {
      setOpen(false);
      if (item.kind === "note" && item.noteId) { router.push(`/note/${item.noteId}`); return; }
      if (item.kind === "tag" && item.tag) { router.push(`/?tag=${item.tag}`); return; }
      switch (item.id) {
        case "new": {
          const id = crypto.randomUUID(); const now = Date.now();
          import("@/lib/storage").then(({ addNote }) => {
            addNote({ id, title: "Untitled Note", content: "", createdAt: now, updatedAt: now, tags: [] });
            router.push(`/note/${id}`);
          });
          break;
        }
        case "save": window.dispatchEvent(new CustomEvent("note:save")); break;
        case "delete": setDeleteOpen(true); break;
        case "export": setExportOpen(true); break;
        case "help": router.push("/help"); break;
        case "theme": { const d = document.documentElement.classList.contains("dark"); setTheme(d ? "light" : "dark"); break; }
        case "zen": setZenMode((p) => { const n = !p; persistZenMode(n); return n; }); break;
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

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg mx-4 bg-popover text-popover-foreground rounded-lg border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 h-10 border-b">
          <svg className="size-4 shrink-0 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); idxRef.current = 0; }}
            onKeyDown={onInputKeyDown}
          />
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[340px] overflow-y-auto overscroll-contain py-1.5">
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

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t text-[10px] text-muted-foreground/30">
          <span>↑↓</span>
          <span>↵ select</span>
          <span>esc</span>
        </div>
      </div>
    </div>
  );
});
