"use client";

import { useEffect, useRef, memo } from "react";
import { OverType } from "overtype";
import { shikiPool } from "@/lib/shiki-worker-pool";
import { useTheme } from "next-themes";

interface ReadOnlyEditorProps {
  content: string;
}

// Cache for extracted inner HTML (fast path for re-renders)
const highlightCache = new Map<string, string>();
const pendingHighlights = new Set<string>();

export const ReadOnlyEditor = memo(
  function ReadOnlyEditor({ content }: ReadOnlyEditorProps) {
    const { resolvedTheme } = useTheme();
    const containerRef = useRef<HTMLDivElement | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editorRef = useRef<any>(null);

    useEffect(() => {
      if (!containerRef.current || editorRef.current) return;

      const styles = getComputedStyle(document.documentElement);

      const [editorInstance] = OverType.init(containerRef.current, {
        value: content,
        placeholder: "",
        autofocus: false,
        fontSize: "15px",
        lineHeight: 1.7,
        mobile: { fontSize: "14px", lineHeight: 1.5 },
        theme: {
          name: "minimal-hierarchy",
          colors: {
            bgPrimary: "transparent",
            bgSecondary: "transparent",
            text: styles.getPropertyValue("--editor-text").trim(),
            h1: styles.getPropertyValue("--editor-h1").trim(),
            h2: styles.getPropertyValue("--editor-h2").trim(),
            h3: styles.getPropertyValue("--editor-h3").trim(),
            strong: styles.getPropertyValue("--editor-strong").trim(),
            em: styles.getPropertyValue("--editor-em").trim(),
            link: styles.getPropertyValue("--editor-link").trim(),
            code: styles.getPropertyValue("--editor-code").trim(),
            codeBg: styles.getPropertyValue("--editor-code-bg").trim(),
            blockquote: styles.getPropertyValue("--editor-blockquote").trim(),
            hr: styles.getPropertyValue("--editor-hr").trim(),
            syntaxMarker: styles.getPropertyValue("--editor-syntax").trim(),
            cursor: "transparent",
            selection: styles.getPropertyValue("--editor-selection").trim(),
          },
        },
        smartLists: true,
        textareaProps: { spellCheck: false, readOnly: true },
      });

      editorRef.current = editorInstance;

      return () => {
        if (editorRef.current) {
          editorRef.current.destroy();
          editorRef.current = null;
        }
      };
    }, [content]);

    useEffect(() => {
      if (!editorRef.current) return;

      const shikiTheme =
        resolvedTheme === "dark" ? "github-dark" : "github-light";

      const syncShikiHighlighter = (code: string, language: string) => {
        const cacheKey = `${language}:${shikiTheme}:${code}`;

        if (highlightCache.has(cacheKey)) {
          return highlightCache.get(cacheKey)!;
        }

        if (!pendingHighlights.has(cacheKey)) {
          pendingHighlights.add(cacheKey);

          const langMap: Record<string, string> = {
            js: "javascript",
            ts: "typescript",
            py: "python",
            rs: "rust",
          };
          const normalizedLang = langMap[language] || language || "text";

          shikiPool.highlight(code, normalizedLang, shikiTheme)
            .then((highlighted) => {
              const match = highlighted.match(/<code[^>]*>([\s\S]*?)<\/code>/);
              const resultHtml = match ? match[1] : code;
              highlightCache.set(cacheKey, resultHtml);
              if (editorRef.current) editorRef.current.updatePreview();
            })
            .catch((error) => console.warn("Shiki highlighting failed:", error))
            .finally(() => pendingHighlights.delete(cacheKey));
        }
        return code;
      };

      editorRef.current.setCodeHighlighter(syncShikiHighlighter);
      editorRef.current.updatePreview();
    }, [resolvedTheme]);

    return (
      <div className="relative flex flex-col w-full h-full min-h-[60vh]">
        <div
          ref={containerRef}
          className="w-full h-full overflow-y-auto note-editor-container custom-scrollbar"
          style={{
            fontFamily: "'Jetbrains Mono', 'Space Mono', monospace",
            fontWeight: "500",
          }}
        />
      </div>
    );
  },
  (prevProps, nextProps) => prevProps.content === nextProps.content,
);
