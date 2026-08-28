"use client";

import { useEffect, useRef, memo, useCallback, useState } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { OverType } from "overtype";
import { syncEditorToContentAtom, contentAtom } from "@/store/noteAtom";
import { shikiPool } from "@/lib/shiki-worker-pool";
import { useTheme } from "next-themes";

interface NoteContentProps {
  initialContent: string;
}

// Global cache for extracted inner HTML (fast path for re-renders)
const highlightCache = new Map<string, string>();
const pendingHighlights = new Set<string>();

// Read CSS variables into a plain object — avoids stale getComputedStyle
function readEditorColors(): Record<string, string> {
  const s = getComputedStyle(document.documentElement);
  return {
    bgPrimary: "transparent",
    bgSecondary: "transparent",
    text: s.getPropertyValue("--editor-text").trim(),
    h1: s.getPropertyValue("--editor-h1").trim(),
    h2: s.getPropertyValue("--editor-h2").trim(),
    h3: s.getPropertyValue("--editor-h3").trim(),
    strong: s.getPropertyValue("--editor-strong").trim(),
    em: s.getPropertyValue("--editor-em").trim(),
    link: s.getPropertyValue("--editor-link").trim(),
    code: s.getPropertyValue("--editor-code").trim(),
    codeBg: s.getPropertyValue("--editor-code-bg").trim(),
    blockquote: s.getPropertyValue("--editor-blockquote").trim(),
    hr: s.getPropertyValue("--editor-hr").trim(),
    syntaxMarker: s.getPropertyValue("--editor-syntax").trim(),
    cursor: s.getPropertyValue("--editor-cursor").trim(),
    selection: s.getPropertyValue("--editor-selection").trim(),
  };
}

export const NoteContent = memo(
  function NoteContent({ initialContent }: NoteContentProps) {
    const { resolvedTheme } = useTheme();

    const containerRef = useRef<HTMLDivElement | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editorRef = useRef<any>(null);
    const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
      undefined,
    );
    const isExternalUpdateRef = useRef(false);
    const isTypingRef = useRef(false);
    // Survives effect cleanup — tracks latest editor content
    const contentRef = useRef(initialContent);

    const [trackedContent, setTrackedContent] = useState(initialContent);
    const stats = (() => {
      const words = trackedContent.trim() ? trackedContent.trim().split(/\s+/).length : 0;
      const chars = trackedContent.length;
      const lines = trackedContent.split("\n").length;
      const minutes = Math.max(1, Math.ceil(words / 200));
      return { words, chars, lines, readingTime: `${minutes} min` };
    })();

    const syncToContent = useSetAtom(syncEditorToContentAtom);
    const externalContent = useAtomValue(contentAtom);

    const debouncedSync = useCallback(
      (content: string) => {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = setTimeout(() => {
          syncToContent(content);
          isTypingRef.current = false;
        }, 500);
      },
      [syncToContent],
    );

    const handleChange = useCallback(
      (newValue: string) => {
        if (isExternalUpdateRef.current) return;
        isTypingRef.current = true;
        contentRef.current = newValue;
        setTrackedContent(newValue);
        debouncedSync(newValue);
      },
      [debouncedSync],
    );

    // Stable ref so init effect doesn't need handleChange in deps
    const handleChangeRef = useRef(handleChange);
    handleChangeRef.current = handleChange;

    // Viewport scroll handler
    useEffect(() => {
      const vv = window.visualViewport;
      if (!vv) return;
      const handler = () => {
        const focused = document.activeElement as HTMLElement;
        if (!focused || !containerRef.current) return;
        const rect = focused.getBoundingClientRect();
        if (rect.bottom > vv.height) {
          window.scrollBy({ top: rect.bottom - vv.height + 24, behavior: "smooth" });
        }
      };
      vv.addEventListener("resize", handler);
      vv.addEventListener("scroll", handler);
      return () => {
        vv.removeEventListener("resize", handler);
        vv.removeEventListener("scroll", handler);
      };
    }, []);

    // INIT EFFECT: Create editor on mount, re-create on theme change
    useEffect(() => {
      if (!containerRef.current) return;

      // Capture current content before destroy
      const currentContent = editorRef.current
        ? editorRef.current.getValue()
        : contentRef.current;

      // Destroy existing editor
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }

      // Block sync during re-init
      isExternalUpdateRef.current = true;
      isTypingRef.current = false;

      // Defer getComputedStyle to ensure CSS variables are updated after theme class change
      const raf = requestAnimationFrame(() => {
        if (!containerRef.current) return;

        const colors = readEditorColors();
        const [editorInstance] = OverType.init(containerRef.current, {
          value: currentContent,
          onChange: (v: string) => handleChangeRef.current(v),
          placeholder: "Start writing...",
          autofocus: false,
          fontSize: "15px",
          lineHeight: 1.7,
          mobile: { fontSize: "12px", lineHeight: 1.3 },
          theme: { name: "minimal-hierarchy", colors },
          smartLists: true,
          textareaProps: { spellCheck: false },
        });

        editorRef.current = editorInstance;

        // Attach Shiki highlighter immediately after editor creation
        const currentShikiTheme = resolvedTheme === "dark" ? "github-dark" : "github-light";
        const syncShikiHighlighter = (code: string, language: string) => {
          const cacheKey = `${language}:${currentShikiTheme}:${code}`;
          if (highlightCache.has(cacheKey)) return highlightCache.get(cacheKey)!;

          if (!pendingHighlights.has(cacheKey)) {
            pendingHighlights.add(cacheKey);
            const langMap: Record<string, string> = { js: "javascript", ts: "typescript", py: "python", rs: "rust" };
            const normalizedLang = langMap[language] || language || "text";

            shikiPool.highlight(code, normalizedLang, currentShikiTheme)
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

        editorInstance.setCodeHighlighter(syncShikiHighlighter);
        editorInstance.updatePreview();

        // Unblock sync after editor is settled
        requestAnimationFrame(() => {
          isExternalUpdateRef.current = false;
        });
      });

      return () => {
        cancelAnimationFrame(raf);
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        if (editorRef.current) {
          editorRef.current.destroy();
          editorRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resolvedTheme]);

    // Sync external changes to editor
    useEffect(() => {
      if (!editorRef.current || isTypingRef.current) return;
      const currentEditorValue = editorRef.current.getValue();
      if (externalContent !== currentEditorValue) {
        isExternalUpdateRef.current = true;
        editorRef.current.setValue(externalContent);
        contentRef.current = externalContent;
        setTrackedContent(externalContent);
        requestAnimationFrame(() => { isExternalUpdateRef.current = false; });
      }
    }, [externalContent]);

    return (
      <div className="relative flex flex-col w-full h-full">
        <div
          ref={containerRef}
          className="note-editor-container flex-1"
          style={{
            width: "100%",
            height: "100%",
            fontFamily: "'Jetbrains Mono', 'Space Mono', monospace",
            fontWeight: "800",
          }}
        />
        <div
          className="fixed bottom-4 xl:bottom-6 pointer-events-none xl:ml-4 ml-3 "
          style={{ width: "100%", zIndex: 20, fontFamily: "'Jetbrains Mono', 'Space Mono', monospace" }}
        >
          <div
            className="flex flex-col xl:flex-row gap-1 xl:gap-4 text-[8px] xl:text-[10px] tracking-[0.2em] pointer-events-auto xl:w-full w-32 "
            style={{ color: "var(--editor-text)", opacity: 0.4 }}
          >
            <div className="flex flex-row items-center">
              <span>{stats.words} words</span>
            </div>
            <div className="flex flex-row items-center" style={{ borderColor: "var(--editor-text)" }}>
              <span>{stats.chars} characters</span>
            </div>
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => prevProps.initialContent === nextProps.initialContent,
);
