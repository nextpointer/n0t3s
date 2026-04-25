"use client";

import { useEffect, useRef, memo, useCallback } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { OverType } from "overtype";
import { syncEditorToContentAtom, contentAtom } from "@/store/noteAtom";

interface NoteContentProps {
  // static props
  initialContent: string;
}

export const NoteContent = memo(
  function NoteContent({ initialContent }: NoteContentProps) {
    // Container ref for OverType initialization
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Editor instance ref
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editorRef = useRef<any>(null);

    // Timeout ref for debounced sync
    const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
      undefined,
    );

    // Flag to prevent sync loop during external updates
    const isExternalUpdateRef = useRef(false);

    // Flag to indicate user is actively typing
    const isTypingRef = useRef(false);

    // Debug counter for tracking re-renders
    const renderCountRef = useRef(0);

    // Write-only atom setter for syncing editor changes to app state
    const syncToContent = useSetAtom(syncEditorToContentAtom);

    // Read-only atom for external content changes
    const externalContent = useAtomValue(contentAtom);

    // Track re-renders in development
    renderCountRef.current++;

    // debounce sync callback
    const debouncedSync = useCallback(
      (content: string) => {
        // Clear existing timeout
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }

        // Set new timeout
        syncTimeoutRef.current = setTimeout(() => {
          // Sync to atoms (triggers save, history, unsaved check)
          syncToContent(content);
          isTypingRef.current = false;
        }, 500);
      },
      [syncToContent],
    );

    // Handle editor changes (user typing)
    const handleChange = useCallback(
      (newValue: string) => {
        if (isExternalUpdateRef.current) return;
        isTypingRef.current = true;

        // Debounce sync to atoms
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

    //init the overtype
    useEffect(() => {
      // Skip if already initialized or container not ready
      if (!containerRef.current || editorRef.current) return;

      const styles = getComputedStyle(document.documentElement);

      // Initialize OverType
      const [editorInstance] = OverType.init(containerRef.current, {
        // Use prop (not atom) - prevents race conditions
        value: initialContent,

        // Handle changes
        onChange: handleChange,
        placeholder: "Start writing...",
        autofocus: false,

        // Typography
        fontSize: "14px",
        lineHeight: 1.75,

        // Mobile responsive
        mobile: {
          fontSize: "12px",
          lineHeight: 1.7,
        },

        // Theme colors from CSS variables
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
        textareaProps: {
          spellCheck: true,
        },
      });

      // Store instance in ref
      editorRef.current = editorInstance;

      return () => {
        // Clear pending sync
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }

        // Destroy editor
        if (editorRef.current) {
          editorRef.current.destroy();
          editorRef.current = null;
        }
      };
    }, []);

    // Sync external changes to editor
    useEffect(() => {
      if (!editorRef.current) return;
      if (isTypingRef.current) return;

      // Get current editor value
      const currentEditorValue = editorRef.current.getValue();

      // Check if external content is different
      if (externalContent !== currentEditorValue) {
        // Set flag to prevent sync loop
        isExternalUpdateRef.current = true;

        // Update editor
        editorRef.current.setValue(externalContent);

        // Clear flag after update completes
        requestAnimationFrame(() => {
          isExternalUpdateRef.current = false;
        });
      }
    }, [externalContent]);

    return (
      <div
        ref={containerRef}
        className="note-editor-container"
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "transparent",
          fontFamily: "'Space Mono', 'Courier New', monospace",
        }}
      />
    );
  },

  /**
   * @returns true if props are equal (skip re-render)
   */
  (prevProps, nextProps) => {
    return prevProps.initialContent === nextProps.initialContent;
  },
);
