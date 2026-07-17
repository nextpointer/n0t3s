// Shiki Web Worker — handles all code highlighting off the main thread
// This keeps the main thread free for 60fps UI

import { createHighlighter, type Highlighter } from "shiki";

let highlighter: Highlighter | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ["github-dark", "github-light"],
      langs: [
        "javascript", "typescript", "jsx", "tsx",
        "python", "rust", "go", "java", "c", "cpp",
        "html", "css", "json", "yaml", "bash", "shell",
        "sql", "markdown", "mdx",
      ],
    });
  }
  return highlighter;
}

self.onmessage = async (e: MessageEvent) => {
  const { id, code, lang, theme } = e.data;
  try {
    const hl = await getHighlighter();
    const html = hl.codeToHtml(code, {
      lang: lang || "text",
      theme: theme || "github-dark",
    });
    self.postMessage({ id, html, error: null });
  } catch {
    // Fallback: return plain code wrapped in pre/code
    const escaped = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    self.postMessage({ id, html: `<pre><code>${escaped}</code></pre>`, error: null });
  }
};
