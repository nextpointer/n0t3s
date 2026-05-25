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

## Export

Open Settings ⚙️ inside any note → **Export Note** → saves as \`.md\`.

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
