"use client";

import { useState } from "react";
import { ReadOnlyEditor } from "@/components/ReadOnlyEditor";
import { Button } from "@/components/ui/button";
import { SolarIcon } from "@/lib/icons";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const HELP_CONTENT = `
# N0T3S Manual

A markdown note editor with AI. Everything stays on your browser.

---

## Writing

Start typing in any note. Markdown formats as you go — \`**bold**\`, \`*italic*\`, \`# headings\` (space after the #), \`> blockquotes\`, code blocks. Notes save automatically, no button needed. Tags are written like \`#tag\` — see Tags below.

---

## Toolbar

On the desktop the formatting toolbar is a frosted-glass pill centred between the title and the writing area, and it stays visible while you type. On a phone it moves to the bottom of the screen and appears only while the on-screen keyboard is up, so it never sits on top of what you are reading.

On a phone the strip shows action buttons by default; tap **T** to slide in the format icons (scrollable), and tap **×** to slide back.

Use it for **Bold**, *Italic*, \`code\`, **H1**/**H2**/**H3**, bullet/numbered/task lists, quotes and links. A button lights up when the caret is inside that kind of text, so you can see what you're about to change.

### Show / hide it

Config (the sliders icon in the bottom bar) has a **Show toolbar** switch. Turn it off to write with no pill at all; bring it back the same way. The choice is remembered.

The same formatting also works from the keyboard:

\`Ctrl+B\` — Bold
\`Ctrl+I\` — Italic
\`Ctrl+K\` — Insert link
\`Ctrl+Shift+7\` / \`Ctrl+Shift+8\` — Numbered / bullet list
\`Ctrl+D\` — Toggle todo on the current line (add / remove)

---

## View Modes

The eye button on the right of the toolbar switches between three modes:

**Edit** — normal editing, markdown syntax visible
**Raw** — plain markdown, no styling
**Preview** — rendered output, no syntax

\`Ctrl+/\` toggles **read mode** on and off. Preview hides the syntax markers and shows real checkboxes, headings and links.

### Task lists

Write \`- [ ] todo\` and it becomes a checkbox. With the caret on that line, \`Ctrl+Enter\` ticks or unticks it, and \`Ctrl+D\` toggles the todo marker on/off. In read mode you can click the checkbox or the whole line.

---

## Tags

Mention a tag anywhere in the text: type \`#work\` and it becomes a pill. \`#pin\` locks a note to the top of your list.

---

## AI Actions

Select text, then use a shortcut (\`Ctrl+Shift+S/R/G/E/I/Q/P\`). The wand menu’s last row opens **Ask AI**. Turn **No AI** on in Config to hide all of it.

---

## Command Palette

\`Ctrl+P\` runs commands; \`Ctrl+O\` searches notes & tags (they hop while open).

---

## Export & layout

Settings (top bar) → Export/Delete. The top bar carries back, undo/redo and Settings; the bottom bar holds notes, search, read, zen, AI, help, Config and Save.

---
*Built with love*
`;

export default function HelpPage() {
  const router = useRouter();
  const [view, setView] = useState<"preview" | "markdown">("preview");
  const content = HELP_CONTENT.trim();

  return (
    <div className="flex h-full w-full flex-col selection:bg-primary/30">
      <div className="mx-auto flex w-full flex-1 flex-col md:w-5xl md:border-l-1 md:border-r-1 md:border-dashed">
        <header className="flex h-10 shrink-0 items-center justify-between border-b border-dashed px-4">
          <div className="flex items-center">
            <Button
              onClick={() => router.back()}
              variant="ghost"
              size="sm"
              className="inline-flex h-7 items-center gap-1.5 rounded-sm px-2 font-mono text-xs text-muted-foreground hover:text-foreground"
            >
              <SolarIcon icon="back" className="h-3 w-3" />
              back
            </Button>
            <span className="ml-3 font-mono text-xs text-foreground/30">manual.md</span>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setView("preview")}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors",
                view === "preview" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={view === "preview"}
              title="Preview"
            >
              <SolarIcon icon="read" className="size-3.5" /> Preview
            </button>
            <button
              type="button"
              onClick={() => setView("markdown")}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors",
                view === "markdown" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={view === "markdown"}
              title="Markdown"
            >
              <SolarIcon icon="plain" className="size-3.5" /> Markdown
            </button>
          </div>
        </header>

        <main className="flex-1 px-6 py-8 md:px-8">
          {view === "preview" ? (
            <ReadOnlyEditor content={content} />
          ) : (
            <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-7 text-foreground/85">
              {content}
            </pre>
          )}
        </main>
      </div>
    </div>
  );
}
