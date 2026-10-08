"use client";

import { useEffect, useRef, memo, useCallback, useState } from "react";
import { useAtom, useSetAtom, useAtomValue } from "jotai";
import { OverType } from "overtype";
import {
  syncEditorToContentAtom,
  contentAtom,
  toolbarEnabledAtom,
  previewColorsAtom,
  editorFontSizeAtom,
  viewModeAtom,
  type ViewMode,
} from "@/store/noteAtom";
import { shikiPool } from "@/lib/shiki-worker-pool";
import { normalizeLang } from "@/lib/shiki-langs";
import { useTheme } from "next-themes";
import { EditorToolbar, type ToolbarEditor } from "./EditorToolbar";
import { CustomCaret } from "./CustomCaret";

interface NoteContentProps {
  initialContent: string;
}

// Global cache for extracted inner HTML (fast path for re-renders)
const highlightCache = new Map<string, string>();
const pendingHighlights = new Set<string>();

interface TaskRef {
  /** Offset of the "[" of the checkbox marker */
  markerStart: number;
  /** Current marker character: " " (unchecked) or "x"/"X" (checked) */
  marker: string;
}

/**
 * Locate every GFM task list item in a markdown source.
 *
 * Mirrors OverType's parser so that the Nth entry always corresponds to the Nth
 * `input[type="checkbox"]` rendered in the preview layer, which is what lets a
 * preview-mode click be mapped back onto its source line. Fenced code blocks
 * are skipped because the parser does not render them as task lists — note that
 * OverType only recognises backtick fences, not tildes.
 */
function scanTaskRefs(text: string): TaskRef[] {
  const refs: TaskRef[] = [];
  let offset = 0;
  let openFenceLength: number | null = null;

  for (const line of text.split("\n")) {
    if (openFenceLength !== null) {
      const close = /^( {0,3})(`{3,})[\t ]*$/.exec(line);
      if (close && close[2].length >= openFenceLength) openFenceLength = null;
      offset += line.length + 1;
      continue;
    }

    const open = /^( {0,3})(`{3,})([^`]*)$/.exec(line);
    if (open) {
      openFenceLength = open[2].length;
      offset += line.length + 1;
      continue;
    }

    // Requires at least one space after the marker, matching the parser.
    const task = /^([ ]*)-([ \t]+)\[([ xX])\]([ \t]*)(.*)$/.exec(line);
    if (task && (task[4] !== "" || task[5] === "")) {
      refs.push({
        markerStart: offset + task[1].length + 1 + task[2].length + 1,
        marker: task[3],
      });
    }

    offset += line.length + 1;
  }

  return refs;
}

/**
 * Flip the Nth task in the textarea source and notify OverType.
 *
 * The textarea is `display: none` in preview mode, so `execCommand` is not
 * available — the value is rewritten directly and an `input` event is emitted,
 * which routes through OverType's global input listener to `updatePreview()`
 * and `onChange`.
 */
function toggleTaskByIndex(textarea: HTMLTextAreaElement, index: number) {
  const ref = scanTaskRefs(textarea.value)[index];
  if (!ref) return;

  const next =
    textarea.value.slice(0, ref.markerStart) +
    (ref.marker.toLowerCase() === "x" ? " " : "x") +
    textarea.value.slice(ref.markerStart + 1);

  textarea.value = next;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * Tag every rendered preview checkbox with its source-line index.
 *
 * OverType replaces `preview.innerHTML` on each render, so a click can be
 * followed by a re-render (async syntax highlighting, or the browser's own
 * default handling) before `change` fires — leaving `event.target` detached.
 * `indexOf` against a live NodeList would then fail and the toggle would
 * silently do nothing. A `data-` attribute survives detachment, so reading it
 * off the event target stays correct either way.
 */
function stampTaskIndices(preview: HTMLElement) {
  const boxes = preview.querySelectorAll<HTMLInputElement>(
    'li.task-list input[type="checkbox"]',
  );
  boxes.forEach((box, index) => {
    box.dataset.taskIndex = String(index);
  });
}

/**
 * Toggle the checkbox on the caret's task line, in place.
 *
 * Returns false when the caret is not on a task item (or spans a selection),
 * so the caller can leave the key alone instead of swallowing it.
 */
function toggleTaskAtCaret(textarea: HTMLTextAreaElement): boolean {
  const caret = textarea.selectionStart;
  if (caret !== textarea.selectionEnd) return false;

  const lineStart = textarea.value.lastIndexOf("\n", caret - 1) + 1;
  let lineEnd = textarea.value.indexOf("\n", caret);
  if (lineEnd === -1) lineEnd = textarea.value.length;

  const line = textarea.value.slice(lineStart, lineEnd);
  const match = /^( *-\s+\[)([ xX])\]/.exec(line);
  if (!match) return false;

  const pos = lineStart + match[1].length;
  const next = match[2].toLowerCase() === "x" ? " " : "x";
  textarea.setRangeText(next, pos, pos + 1, "preserve");
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
}

/**
 * Read CSS variables into a plain object — avoids stale getComputedStyle.
 *
 * `colors` drives edit mode. Preview mode reads a completely separate set of
 * `--preview-*` variables and, when `previewColors` is omitted, silently falls
 * back to OverType's baked-in defaults (a navy serif palette that clashes with
 * the app). Feeding it the same tokens keeps preview on-brand and legible.
 *
 * Every accent token is mapped through, so preview is the colourful,
 * read-only rendering rather than black-on-black. Headings, strong, em, links,
 * code and quotes each keep their own editor colour.
 */
function readEditorColors(withPreviewColor: boolean): {
  colors: Record<string, string>;
  previewColors: Record<string, string>;
} {
  const s = getComputedStyle(document.documentElement);
  const read = (name: string) => s.getPropertyValue(name).trim();

  const text = read("--editor-text");
  const h1 = read("--editor-h1");
  const h2 = read("--editor-h2");
  const h3 = read("--editor-h3");
  const link = read("--editor-link");
  const code = read("--editor-code");
  const codeBg = read("--editor-code-bg");
  const blockquote = read("--editor-blockquote");
  const hr = read("--editor-hr");
  const strong = read("--editor-strong");
  const em = read("--editor-em");
  const syntax = read("--editor-syntax");
  const cursor = read("--editor-cursor");
  const selection = read("--editor-selection");

  // Preview colour off: every accent collapses onto the body colour, so the
  // rendered note reads monochrome. Shiki sets its own inline colours per
  // token, so code blocks stay highlighted either way.
  const px = (value: string) => (withPreviewColor ? value : text);

  return {
    colors: {
      bgPrimary: "transparent",
      bgSecondary: "transparent",
      text,
      h1,
      h2,
      h3,
      strong,
      em,
      link,
      code,
      codeBg,
      blockquote,
      hr,
      syntaxMarker: syntax,
      cursor,
      selection,
    },
    previewColors: {
      bg: "transparent",
      text,
      h1: px(h1),
      h2: px(h2),
      h3: px(h3),
      strong: px(strong),
      em: px(em),
      link: px(link),
      code: px(code),
      codeBg,
      blockquote: px(blockquote),
      hr,
    },
  };
}

/**
 * Word/character/line counts.
 *
 * Deliberately NOT derived during render. Splitting a whole document into
 * words on every keystroke is O(n) and became the single biggest cost the app
 * added on top of OverType's own re-parse — ~10ms per key on a large note.
 * It is computed inside the debounced sync instead, which already runs once
 * typing pauses.
 */
function computeStats(text: string) {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  return {
    words,
    chars: text.length,
    lines: text.split("\n").length,
    readingTime: `${Math.max(1, Math.ceil(words / 200))} min`,
  };
}

export const NoteContent = memo(
  function NoteContent({ initialContent }: NoteContentProps) {
    const { resolvedTheme } = useTheme();
    const toolbarEnabled = useAtomValue(toolbarEnabledAtom);
    const previewColorsOn = useAtomValue(previewColorsAtom);
    const fontSize = useAtomValue(editorFontSizeAtom);

    // Read by the init effect without becoming one of its dependencies, so
    // toggling a setting never rebuilds the editor.
    const previewColorsRef = useRef(previewColorsOn);
    previewColorsRef.current = previewColorsOn;
    const fontSizeRef = useRef(fontSize);
    fontSizeRef.current = fontSize;

    // Records in IndexedDB are not runtime-validated, so a malformed/legacy
    // note can hand us undefined here and crash every derived value below.
    const startContent =
      typeof initialContent === "string" ? initialContent : "";

    const containerRef = useRef<HTMLDivElement | null>(null);
    // Root wrapper — owns --ot-bottom-inset, which the toolbar reads. The
    // toolbar is a sibling of the OverType host, so the var cannot live on
    // containerRef or it would not inherit into the toolbar.
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editorRef = useRef<any>(null);
    const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
      undefined,
    );
    const isExternalUpdateRef = useRef(false);
    const isTypingRef = useRef(false);
    // Survives effect cleanup — tracks latest editor content
    const contentRef = useRef(startContent);
    // Cancels a scheduled (rAF-coalesced) preview refresh on teardown.
    const pendingFrameRef = useRef<(() => void) | null>(null);

    // Lives in state (not just the ref) so the custom toolbar re-renders when
    // the editor is created/destroyed — a ref change would not notify React.
    const [editor, setEditor] = useState<ToolbarEditor | null>(null);
    // The textarea, so the custom caret can track it.
    const [textareaEl, setTextareaEl] = useState<HTMLTextAreaElement | null>(null);
    // Shared with the bottom bar so the read-mode button there stays in sync.
    const [viewMode, setViewMode] = useAtom(viewModeAtom);
    // Lets the init effect restore the current mode after a theme rebuild
    // without listing viewMode as a dependency (which would re-create the
    // editor on every mode switch).
    const viewModeRef = useRef(viewMode);
    viewModeRef.current = viewMode;

    const [stats, setStats] = useState(() => computeStats(startContent));
    // True while the software keyboard covers part of the layout viewport.
    const [keyboardOpen, setKeyboardOpen] = useState(false);

    const syncToContent = useSetAtom(syncEditorToContentAtom);
    const externalContent = useAtomValue(contentAtom);

    const debouncedSync = useCallback(
      (content: string) => {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = setTimeout(() => {
          syncToContent(content);
          setStats(computeStats(content));
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
        debouncedSync(newValue);
      },
      [debouncedSync],
    );

    // Stable ref so init effect doesn't need handleChange in deps
    const handleChangeRef = useRef(handleChange);
    handleChangeRef.current = handleChange;

    /**
     * OverType skips its own click-to-toggle handler in preview mode
     * (`container.dataset.mode === "preview"`), so the rendered checkbox only
     * flips its own DOM state and the markdown is never updated. Rewrite the
     * source line here so the toggle counts: it re-renders, syncs, saves and
     * lands in undo history.
     */
    const handlePreviewTaskChange = useCallback((event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") {
        return;
      }
      const current = editorRef.current;
      const textarea = current?.textarea as HTMLTextAreaElement | undefined;
      if (!textarea) return;

      const index = Number(target.dataset.taskIndex);
      if (!Number.isInteger(index)) return;

      toggleTaskByIndex(textarea, index);
    }, []);

    /** The editor follows the shared atom, so every entry point stays in sync. */
    const applyViewMode = useCallback(
      (mode: ViewMode) => {
        setViewMode(mode);
      },
      [setViewMode],
    );

    const toggleReadMode = useCallback(() => {
      applyViewMode(viewModeRef.current === "preview" ? "edit" : "preview");
    }, [applyViewMode]);

    // Preview colours live in the editor theme, so re-apply it when the
    // setting changes. setTheme() is the documented path that emits both
    // `colors` and `previewColors`.
    useEffect(() => {
      const instance = editorRef.current;
      if (!instance) return;
      const { colors, previewColors } = readEditorColors(previewColorsOn);
      instance.setTheme({ name: "minimal-hierarchy", colors, previewColors });
    }, [previewColorsOn]);

    // Font size is applied through reinit so OverType regenerates the
    // <=640px media rule as well as the desktop metrics. Debounced, because
    // dragging a slider would otherwise rebuild on every frame.
    useEffect(() => {
      const instance = editorRef.current;
      if (!instance) return;
      const size = fontSize;
      const id = setTimeout(() => {
        instance.reinit({
          fontSize: `${size}px`,
          mobile: { fontSize: `${Math.max(12, size - 3)}px`, lineHeight: 1.3 },
        });
      }, 250);
      return () => clearTimeout(id);
    }, [fontSize]);

    // Drive the editor whenever the shared mode changes (toolbar dropdown,
    // Ctrl+/, the bottom-bar button). The init effect handles the first value,
    // before the editor exists.
    useEffect(() => {
      const instance = editorRef.current;
      if (!instance) return;
      if (viewMode === "preview") instance.showPreviewMode();
      else if (viewMode === "plain") instance.showPlainTextarea();
      else instance.showNormalEditMode();
    }, [viewMode]);

    /**
     * Read mode = rendered preview, no markdown syntax.
     *
     * Bound to Ctrl+/ (Cmd+/ on macOS). Every other shortcut in this app uses
     * Ctrl+Shift+<letter>, but those collide with browser commands (new window,
     * devtools, private window, quit, …), so this one deliberately avoids the
     * Shift modifier — Ctrl+/ is unbound in Chrome, Firefox and Safari.
     */
    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key !== "/" || !(e.ctrlKey || e.metaKey) || e.altKey) return;
        e.preventDefault();
        toggleReadMode();
      };
      // Also reachable from the command palette ("Toggle read mode").
      const onReadModeEvent = () => toggleReadMode();

      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("note:readmode", onReadModeEvent);
      return () => {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("note:readmode", onReadModeEvent);
      };
    }, [toggleReadMode]);

    /**
     * Toggle the task checkbox at the caret with Ctrl+Enter.
     *
     * Ctrl+Enter is unused by browsers (unlike Ctrl+Shift+<letter> combos), and
     * Enter is the natural "do something to this line" key while writing a list.
     */
    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key !== "Enter" || !(e.ctrlKey || e.metaKey) || e.shiftKey) return;
        const instance = editorRef.current;
        const textarea = instance?.textarea as HTMLTextAreaElement | undefined;
        if (!textarea) return;
        // Preview mode hides the textarea; the click-to-toggle path owns that.
        if (instance.container.dataset.mode === "preview") return;
        if (!toggleTaskAtCaret(textarea)) return;
        e.preventDefault();
      };

      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    // Viewport scroll handler + toolbar keyboard offset
    useEffect(() => {
      const vv = window.visualViewport;
      if (!vv) return;

      const syncToolbarOffset = () => {
        const host = wrapperRef.current ?? containerRef.current;
        if (!host) return;
        // How much of the layout viewport the keyboard/URL bar is covering.
        const keyboard = Math.max(
          0,
          Math.round(window.innerHeight - vv.height - vv.offsetTop),
        );
        // With no keyboard up, keep clear of the fixed action bar instead.
        const reserved = keyboard > 24 ? 0 : 72;
        host.style.setProperty("--ot-bottom-inset", `${keyboard + reserved}px`);
        // Editor padding so the last line can scroll above the keyboard.
        host.style.setProperty("--ot-keyboard", `${keyboard}px`);
      };

      const handler = () => {
        const focused = document.activeElement as HTMLElement;
        if (!focused || !containerRef.current) return;
        const rect = focused.getBoundingClientRect();
        if (rect.bottom > vv.height) {
          window.scrollBy({ top: rect.bottom - vv.height + 24, behavior: "smooth" });
        }
      };

      syncToolbarOffset();
      vv.addEventListener("resize", handler);
      vv.addEventListener("scroll", handler);
      window.addEventListener("resize", syncToolbarOffset);
      return () => {
        vv.removeEventListener("resize", handler);
        vv.removeEventListener("scroll", handler);
        window.removeEventListener("resize", syncToolbarOffset);
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

        const { colors, previewColors } = readEditorColors(previewColorsRef.current);
        const [editorInstance] = OverType.init(containerRef.current, {
          value: currentContent,
          onChange: (v: string) => handleChangeRef.current(v),
          placeholder: "Start writing...",
          clickToToggleTasks: true,
          // OverType's own toolbar is unthemed (hard-coded CSS vars) and cannot
          // sit above the mobile keyboard, so the app renders its own.
          toolbar: false,
          autofocus: false,
          fontSize: `${fontSizeRef.current}px`,
          lineHeight: 1.7,
          mobile: { fontSize: `${Math.max(12, fontSizeRef.current - 3)}px`, lineHeight: 1.3 },
          theme: { name: "minimal-hierarchy", colors, previewColors },
          smartLists: true,
          textareaProps: { spellCheck: false },
          onRender: (previewEl: HTMLElement, mode: string) => {
            if (mode === "preview") stampTaskIndices(previewEl);
          },
        });

        editorRef.current = editorInstance;
        setEditor(editorInstance as ToolbarEditor);
        setTextareaEl(editorInstance.textarea as HTMLTextAreaElement);

        // OverType drops per-instance `previewColors` on first build: the
        // injected stylesheet bakes `--preview-*-default` from the *global*
        // solar theme, and the inline vars written during init include only
        // `colors`. Re-applying the theme is the documented path that emits
        // both, which is what keeps preview text on-theme instead of navy.
        editorInstance.setTheme({ name: "minimal-hierarchy", colors, previewColors });

        // The editor is rebuilt on theme change, which resets it to edit mode.
        // Restore whatever the user was actually looking at.
        const remembered = viewModeRef.current;
        if (remembered === "preview") editorInstance.showPreviewMode();
        else if (remembered === "plain") editorInstance.showPlainTextarea();

        // Make preview-mode checkboxes write back to the markdown source.
        // Delegated on the preview root because its innerHTML is replaced on
        // every re-render.
        const previewEl = editorInstance.preview as HTMLElement | undefined;
        previewEl?.addEventListener("change", handlePreviewTaskChange);

        // Attach Shiki highlighter immediately after editor creation
        const currentShikiTheme = resolvedTheme === "dark" ? "github-dark" : "github-light";

        /**
         * Re-render at most once per frame.
         *
         * Every resolved highlight used to call updatePreview() directly. A long
         * paste can contain dozens of code blocks, so that meant dozens of full
         * re-parses of the whole document back to back and the page crawled.
         */
        let highlightFrame = 0;
        const schedulePreviewRefresh = () => {
          if (highlightFrame) return;
          highlightFrame = requestAnimationFrame(() => {
            highlightFrame = 0;
            if (editorRef.current) editorRef.current.updatePreview();
          });
        };

        const syncShikiHighlighter = (code: string, language: string) => {
          const normalizedLang = normalizeLang(language);
          // Unknown language: return the source untouched and skip the worker.
          if (!normalizedLang) return code;

          const cacheKey = `${normalizedLang}:${currentShikiTheme}:${code}`;
          const cached = highlightCache.get(cacheKey);
          if (cached !== undefined) return cached;

          if (!pendingHighlights.has(cacheKey)) {
            pendingHighlights.add(cacheKey);
            shikiPool
              .highlight(code, normalizedLang, currentShikiTheme)
              .then((highlighted) => {
                const match = highlighted.match(/<code[^>]*>([\s\S]*?)<\/code>/);
                const resultHtml = match ? match[1] : code;
                highlightCache.set(cacheKey, resultHtml);
                schedulePreviewRefresh();
              })
              .catch((error) => console.warn("Shiki highlighting failed:", error))
              .finally(() => pendingHighlights.delete(cacheKey));
          }
          return code;
        };

        editorInstance.setCodeHighlighter(syncShikiHighlighter);
        editorInstance.updatePreview();
        pendingFrameRef.current = () => {
          if (highlightFrame) {
            cancelAnimationFrame(highlightFrame);
            highlightFrame = 0;
          }
        };

        // Unblock sync after editor is settled
        requestAnimationFrame(() => {
          isExternalUpdateRef.current = false;
        });
      });

      return () => {
        cancelAnimationFrame(raf);
        pendingFrameRef.current?.();
        pendingFrameRef.current = null;
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        setEditor(null);
        setTextareaEl(null);
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
        setStats(computeStats(externalContent));
        requestAnimationFrame(() => { isExternalUpdateRef.current = false; });
      }
    }, [externalContent]);

    return (
      <div
        ref={wrapperRef}
        data-keyboard={keyboardOpen ? "open" : "closed"}
        className="relative flex flex-col w-full h-full"
      >
        {toolbarEnabled && viewMode !== "preview" && (
          <EditorToolbar
            editor={editor}
            viewMode={viewMode}
            onViewModeChange={applyViewMode}
            mobileVisible={keyboardOpen}
          />
        )}
        <div
          ref={containerRef}
          className="note-editor-container note-editor-host relative flex-1 min-h-0"
          style={{
            width: "100%",
            height: "100%",
            fontFamily: "'Jetbrains Mono', 'Space Mono', monospace",
            fontWeight: "800",
          }}
        />
        <CustomCaret textarea={textareaEl} />

        <div
          className="note-stats fixed bottom-4 xl:bottom-6 pointer-events-none xl:ml-4 ml-3 "
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
