"use client";

import { ArrowLeft } from "lucide-react";
import { ReadOnlyEditor } from "@/components/ReadOnlyEditor";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const HELP_CONTENT = `
# N0T3S Manual

A markdown note editor with AI. Everything stays on your browser.

---

## Writing

Start typing in any note. Markdown formats as you go — \`**bold**\`, \`*italic*\`, \`# headings\`, \`> blockquotes\`, code blocks. Notes save automatically, no button needed.

---

## Toolbar

The formatting toolbar sits at the top of the editor, centred, and stays visible while you type. On a phone it moves to the bottom of the screen and appears only while the on-screen keyboard is up, so it never sits on top of what you are reading.

Use it for **Bold**, *Italic*, \`code\`, **H1**/**H2**/**H3**, bullet/numbered/task lists, quotes and links. A button lights up when the caret is inside that kind of text, so you can see what you're about to change.

Every button has a tooltip — hover it to see the name and the keyboard shortcut.

### Show / hide it

The toolbar toggle is the small formatting-bar icon in the bottom bar (next to search). Click it to hide or bring the toolbar back. The choice is remembered.

The same formatting also works from the keyboard:

\`Ctrl+B\` — Bold
\`Ctrl+I\` — Italic
\`Ctrl+K\` — Insert link
\`Ctrl+Shift+7\` / \`Ctrl+Shift+8\` — Numbered / bullet list

---

## View Modes

The eye button on the right of the toolbar switches between three modes:

**Edit** — normal editing, markdown syntax visible
**Raw** — plain markdown, no styling
**Preview** — rendered output, no syntax

\`Ctrl+/\` toggles **read mode** on and off. Preview hides the syntax markers and shows real checkboxes, headings and links. Your place in the note is kept, and switching themes never drops you out of the mode you chose.

### Task lists

Write \`- [ ] todo\` and it becomes a checkbox. With the caret on that line, \`Ctrl+Enter\` ticks or unticks it. In read mode you can just click the checkbox. Either way the markdown updates and the note saves.

Ticking an item also dims and strikes through the text so you can see what is already done.

---

### Colour and size

Settings ⚙️ has two switches that change how things look:

**Preview colours** — on, rendered preview keeps the coloured headings, bold and italic. Off, the whole note reads monochrome. Code blocks stay syntax-highlighted either way.

**Font size** — a slider from 12px to 22px. It applies to the editor straight away, and phones get a slightly smaller size automatically so lines still fit.

---

## Reading

\`Ctrl+/\` toggles read mode, and the eye button in the bottom bar does the same. In read mode the formatting toolbar steps out of the way, syntax markers disappear, and the note is just the rendered document.

Task checkboxes stay clickable in read mode: tick one and the markdown, the word count and the note itself all update.

---

## Tags & Pinning

Add tags below the note title. Type a word, press Enter.

The \`pin\` tag is special — it locks that note to the top of your list permanently.

---

## AI Actions

Select any text first, then use a shortcut.

\`Ctrl+Shift+S\` — Summarize
\`Ctrl+Shift+R\` — Rewrite
\`Ctrl+Shift+G\` — Fix grammar
\`Ctrl+Shift+E\` — Expand
\`Ctrl+Shift+I\` — Simplify
\`Ctrl+Shift+Q\` — Extract todos
\`Ctrl+Shift+P\` — Ask AI anything


## Zen Mode

\`Ctrl+Shift+Z\` — hides everything except the editor. Same shortcut to exit.

---

## Command Palette

\`Ctrl+P\` anywhere opens the palette. Search notes and tags, or run a command. Commands that act on the open note (save, delete, export, AI) only appear while you are inside one.

---

## Export

Open Settings ⚙️ inside any note → **Export Note** → saves as \`.md\`.

Auto Save lives in that same menu. Turn it off if you would rather press Save yourself.

**No AI** is in there too. Switching it on hides every AI button and shortcut, so nothing can ever send your notes anywhere.

---

*Built with love*
`;

export default function HelpPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen w-full bg-background selection:bg-primary/30">
      <div className="w-full max-w-2xl mx-auto border-l border-r border-dashed border-foreground/20 flex flex-col flex-1">
        {/* Header */}
        <header className="border-b border-dashed border-foreground/20 h-10 flex items-center px-4 shrink-0">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            size="sm"
            className="h-7 px-2 rounded-sm text-xs font-mono text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3 h-3" />
            back
          </Button>
          <span className="ml-3 text-xs font-mono text-foreground/30">
            manual.md
          </span>
        </header>

        {/* Content */}
        <main className="flex-1 px-8 py-10">
          <ReadOnlyEditor content={HELP_CONTENT.trim()} />
        </main>
      </div>
    </div>
  );
}
