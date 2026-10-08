// Shiki Web Worker — handles all code highlighting off the main thread
// This keeps the main thread free for 60fps UI

import { createHighlighter, type Highlighter } from "shiki";
import { SHIKI_LANGS } from "./shiki-langs";

let highlighter: Highlighter | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ["github-dark", "github-light"],
      langs: [...SHIKI_LANGS],
    });
  }
  return highlighter;
}

self.onmessage = async (e: MessageEvent) => {
  const { id, code, lang, theme } = e.data;
  try {
    const hl = await getHighlighter();
    // Fall back to plain text for anything not registered, instead of letting
    // codeToHtml throw and losing even basic <pre>/<code> structure.
    const loaded = hl.getLoadedLanguages();
    const useLang = loaded.includes(lang) ? lang : "text";
    const html = hl.codeToHtml(code, {
      lang: useLang,
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