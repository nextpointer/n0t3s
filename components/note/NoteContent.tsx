"use client";

import { useEffect, useRef, memo, useCallback, useState } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { OverType } from "overtype";
import { syncEditorToContentAtom, contentAtom } from "@/store/noteAtom";

interface NoteContentProps {
  initialContent: string;
}

export const NoteContent = memo(
  function NoteContent({ initialContent }: NoteContentProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editorRef = useRef<any>(null);
    const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
      undefined,
    );
    const isExternalUpdateRef = useRef(false);
    const isTypingRef = useRef(false);

    const [stats, setStats] = useState({ words: 0, chars: 0 });

    const syncToContent = useSetAtom(syncEditorToContentAtom);
    const externalContent = useAtomValue(contentAtom);

    // Helper to calculate stats
    const calculateStats = (text: string) => {
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const chars = text.length;
      setStats({ words, chars });
    };

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

        // Update stats immediately for UI responsiveness
        calculateStats(newValue);
        debouncedSync(newValue);
      },
      [debouncedSync],
    );

    useEffect(() => {
      const vv = window.visualViewport;
      if (!vv) return;
      const handler = () => {
        const focused = document.activeElement as HTMLElement;
        if (!focused || !containerRef.current) return;
        const rect = focused.getBoundingClientRect();
        if (rect.bottom > vv.height) {
          window.scrollBy({
            top: rect.bottom - vv.height + 24,
            behavior: "smooth",
          });
        }
      };
      vv.addEventListener("resize", handler);
      vv.addEventListener("scroll", handler);
      return () => {
        vv.removeEventListener("resize", handler);
        vv.removeEventListener("scroll", handler);
      };
    }, []);

    // Initialize OverType
    useEffect(() => {
      if (!containerRef.current || editorRef.current) return;

      const styles = getComputedStyle(document.documentElement);

      const [editorInstance] = OverType.init(containerRef.current, {
        value: initialContent,
        onChange: handleChange,
        placeholder: "Start writing...",
        autofocus: false,
        fontSize: "15px",
        lineHeight: 1.7,
        mobile: { fontSize: "12px", lineHeight: 1.3 },
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
            cursor: styles.getPropertyValue("--editor-cursor").trim(),
            selection: styles.getPropertyValue("--editor-selection").trim(),
          },
        },
        smartLists: true,
        textareaProps: { spellCheck: false },
      });

      editorRef.current = editorInstance;

      // Set initial stats
      calculateStats(initialContent);

      return () => {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        if (editorRef.current) {
          editorRef.current.destroy();
          editorRef.current = null;
        }
      };
    }, []);

    // Sync external changes to editor
    useEffect(() => {
      if (!editorRef.current || isTypingRef.current) return;

      const currentEditorValue = editorRef.current.getValue();

      if (externalContent !== currentEditorValue) {
        isExternalUpdateRef.current = true;
        editorRef.current.setValue(externalContent);

        // Update stats for external changes (like undo/redo or loading)
        calculateStats(externalContent);

        requestAnimationFrame(() => {
          isExternalUpdateRef.current = false;
        });
      }
    }, [externalContent]);

    return (
      <div className="relative flex flex-col w-full h-full">
        {/* Editor Container */}
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
          className="fixed bottom-4 xl:bottom-6 pointer-events-none xl:ml-4 ml-3"
          style={{
            width: containerRef.current
              ? `${containerRef.current.offsetWidth}px`
              : "100%",
            zIndex: 10,
            fontFamily: "'Jetbrains Mono', 'Space Mono', monospace",
          }}
        >
          <div
            className="flex flex-col xl:flex-row gap-1 xl:gap-4 text-[8px] xl:text-[10px] tracking-[0.2em] pointer-events-auto"
            style={{ color: "var(--editor-text)", opacity: 0.4 }}
          >
            <div className="flex flex-row items-center">
              <span>{stats.words} words</span>
            </div>
            <div
              className="flex flex-row items-center"
              style={{ borderColor: "var(--editor-text)" }}
            >
              <span>{stats.chars} characters</span>
            </div>
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) =>
    prevProps.initialContent === nextProps.initialContent,
);
