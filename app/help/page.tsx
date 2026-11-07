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

Start typing in any note. Markdown formats as you go — \`**bold**\`, \`*italic*\`, \`# headings\` (space after the #), \`> blockquotes\`, code blocks. Notes save automatically, no button needed. Tags are written like \`#tag\` — see Tags below.

---

## Toolbar

On the desktop the formatting toolbar is a frosted-glass pill centred between the title and the writing area, and it stays visible while you type. On a phone it moves to the bottom of the screen and appears only while the on-screen keyboard is up, so it never sits on top of what you are reading.

On a phone the strip carries **everything** — swipe it sideways (it bounces at the edges) and past the format buttons you'll find save, undo, redo, AI and settings, so nothing needs the top bar while the keyboard is up.

Use it for **Bold**, *Italic*, \`code\`, **H1**/**H2**/**H3**, bullet/numbered/task lists, quotes and links. A button lights up when the caret is inside that kind of text, so you can see what you're about to change.

Every button has a tooltip — hover it to see the name and the keyboard shortcut.

### Show / hide it

### Show / hide it

The toolbar toggle is the small formatting-bar icon in the bottom bar (next to search — which is also the palette: note & tag search via \`Ctrl+O\`, commands via \`Ctrl+P\`, and the list icon takes you straight back to all notes). Click it to hide or bring the toolbar back. The choice is remembered.

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

**Font size** — an elastic slider from 12px to 22px: drag or click anywhere on the track (it bounces past the edges and snaps to the marks), or focus it and use arrow keys (Shift for 10×). It applies to the editor straight away, and phones get a slightly smaller size automatically so lines still fit. On a phone the whole settings menu opens as a bottom sheet.

---

## Reading

\`Ctrl+/\` toggles read mode, and the eye button in the bottom bar does the same. In read mode the formatting toolbar steps out of the way, syntax markers disappear, and the note is just the rendered document.

Task checkboxes stay clickable in read mode: tick one and the markdown, the word count and the note itself all update.

---

## Tags

Mention a tag anywhere in the text: type \`#work\` — even mid-sentence — and it becomes a pill. While typing, a suggestion list offers tags from all your notes; pick one with Enter or Tab.

Tags are collected wherever you mention them: filter by one on the home screen, or search in the palette.

The \`#pin\` tag is special — put it in a note and it locks to the top of your list permanently.

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


Undo and redo use the system edit history — press \`Ctrl/Cmd+Z\` or \`Ctrl/Cmd+Shift+Z\`, use the toolbar arrows or the browser's own Edit menu, and they all stay in one stack. Because tags are plain text, deleting a \`#tag\` is undoable like any other typing.

## Zen Mode

\`Ctrl/Cmd+Shift+Space\` — hides everything except the editor. Same shortcut to exit.

---

## Command Palette

\`Ctrl+P\` anywhere opens the command runner — commands and insert items only. \`Ctrl+O\` opens note & tag search instead; the two shortcuts hop between them while open. Commands that act on the open note (save, delete, export, AI) only appear while you are inside one.

The search is fuzzy and forgiving: \`ins cd\` finds the code block, \`hr\` finds the horizontal line, and best matches rise to the top of their section. Synonyms count too — typing \`light\` or \`dark\` reaches the theme toggle, \`trash\` finds delete, \`today\` finds the date insert.

**Insert commands** land exactly where your cursor is, like typed text — one undo step: today's date, the current time, a fenced code block, a horizontal line, or a link. On a phone the palette slides up as a bottom sheet.

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
    // No background of its own: the app shell's canvas shows through, the
    // same as the home and note pages. The column matches the note editor
    // (5xl, dashed rail borders at md+) so jumping between them doesn't
    // change the page's tune.
    <div className="flex flex-col h-full w-full selection:bg-primary/30">
      <div className="w-full md:w-5xl mx-auto md:border-l-1 md:border-r-1 md:border-dashed flex flex-col flex-1">
        {/* Header */}
        <header className="border-b border-dashed h-10 flex items-center px-4 shrink-0">
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
