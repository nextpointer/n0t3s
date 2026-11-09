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
  aiEnabledAtom,
  checkUnsavedAtom,
  spellCheckAtom,
  type ViewMode,
} from "@/store/noteAtom";
import { shikiPool } from "@/lib/shiki-worker-pool";
import { normalizeLang } from "@/lib/shiki-langs";
import { installTagSyntax } from "@/lib/tag-syntax";
import { useTheme } from "next-themes";
import { EditorToolbar, type ToolbarEditor } from "./EditorToolbar";
import { TagAutocomplete } from "./TagAutocomplete";
import { registerNoteEditor } from "@/lib/editor-registry";
import { rememberEditorSelection, captureEditorSelection, applyToSelection, applyReplacementToEditor, type EditorSelection } from "@/lib/ai-selection";
import { UseAIActions } from "@/hooks/useAIActions";
import { useIsPhone } from "@/hooks/use-is-phone";
import { SolarIcon, type IconId } from "@/lib/icons";
import toast from "react-hot-toast";

interface NoteContentProps {
  initialContent: string;
}

function SelectionPromptForm({
  isPhone,
  onBack,
  onRun,
}: {
  isPhone: boolean;
  onBack: () => void;
  onRun: (instruction: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const submit = () => {
    const inst = prompt.trim();
    if (inst) onRun(inst);
  };
  return (
    <form
      className="flex min-w-0 flex-col gap-1.5 p-0.5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        autoFocus
        rows={2}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={isPhone ? "Edit selection…" : "Edit selection… (Ctrl+Enter to run)"}
        className="max-h-40 min-h-[2.75rem] w-full min-w-0 resize-none overflow-y-auto rounded-xl bg-foreground/[0.04] px-2.5 py-2 text-[13px] leading-relaxed outline-none placeholder:text-muted-foreground/35 [field-sizing:content]"
      />
      <div className="flex items-center justify-end gap-1.5">
        <button type="button" className="shrink-0 rounded-xl px-2.5 py-1.5 text-[12px] text-muted-foreground/70 transition-colors hover:bg-foreground/[0.05]" onClick={onBack}>Back</button>
        <button type="submit" className="shrink-0 rounded-xl bg-foreground/[0.08] px-2.5 py-1.5 text-[12px] text-foreground/85 transition-colors hover:bg-foreground/[0.12]">Run</button>
      </div>
    </form>
  );
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
  // Keep the toggled line in view (list/todo edits near edges otherwise stick).
  requestAnimationFrame(() => {
    try { textarea.focus(); } catch { /* noop */ }
  });
  return true;
}

/**
 * The text a palette "note:insert" command splices at the caret. Date and
 * time are local-clock and markdown-friendly (`2026-11-07`, `14:35`).
 *
 * The rule keeps its own line: a `---` glued beneath a paragraph line is a
 * CommonMark setext heading that would swallow the paragraph into an H2, so
 * a break is inserted first whenever the caret's line (or the one above)
 * carries text. The code block opens a fenced block and leaves the caret
 * parked on the empty line inside it.
 *
 * `link` is not text — it routes to OverType's insertLink engine.
 */
function insertionFor(kind: string, textarea: HTMLTextAreaElement): string | null {
  const pad = (n: number) => String(n).padStart(2, "0");
  switch (kind) {
    case "date": {
      const d = new Date();
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
    case "time": {
      const d = new Date();
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    case "hr": {
      const before = textarea.value.slice(0, textarea.selectionStart);
      const lineStart = before.lastIndexOf("\n") + 1;
      const onCaretLine = before.slice(lineStart).trim().length > 0;
      if (onCaretLine) return "\n---\n";
      // Fresh line: the rule still needs a separator unless an empty line
      // already sits above (or the rule starts the document), else `line1`
      // followed by `---` collapses into a setext H2.
      const above = before.slice(0, lineStart);
      const blankAbove = lineStart === 0 || /\n[ \t]*\n$/.test(above);
      return `${blankAbove ? "" : "\n"}---\n`;
    }
    case "code":
      return "```\n\n```";
    default:
      return null;
  }
}

/**
 * Splice `text` into a textarea exactly at its caret — the same native
 * execCommand("insertText") path the AI rewrite and undo/redo ride, so it
 * is one step on the browser's undo stack and fires the input event that
 * syncs OverType, stats and autosave.
 *
 * The element's selection survives blur (the palette held focus), so
 * capturing and re-asserting it around focus restores "where the cursor
 * was" precisely. Wonky environments that refuse focus are reported via
 * the return value so the caller can defer to a mode switch first.
 */
function insertAtCaret(textarea: HTMLTextAreaElement, text: string): boolean {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  if (document.activeElement !== textarea) {
    textarea.focus();
  }
  if (document.activeElement !== textarea) return false;
  textarea.setSelectionRange(start, end);
  return document.execCommand("insertText", false, text);
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

export const NoteContent = memo(
  function NoteContent({ initialContent }: NoteContentProps) {
    const { resolvedTheme } = useTheme();
    const toolbarEnabled = useAtomValue(toolbarEnabledAtom);
    const previewColorsOn = useAtomValue(previewColorsAtom);
    const fontSize = useAtomValue(editorFontSizeAtom);
    const spellCheck = useAtomValue(spellCheckAtom);

    // Read by the init effect without becoming one of its dependencies, so
    // toggling a setting never rebuilds the editor.
    const previewColorsRef = useRef(previewColorsOn);
    previewColorsRef.current = previewColorsOn;
    const fontSizeRef = useRef(fontSize);
    fontSizeRef.current = fontSize;
    const spellCheckRef = useRef(spellCheck);
    spellCheckRef.current = spellCheck;

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
    // Shared with the bottom bar so the read-mode button there stays in sync.
    const [viewMode, setViewMode] = useAtom(viewModeAtom);
    // Lets the init effect restore the current mode after a theme rebuild
    // without listing viewMode as a dependency (which would re-create the
    // editor on every mode switch).
    const viewModeRef = useRef(viewMode);
    viewModeRef.current = viewMode;

    // True while the software keyboard covers part of the layout viewport.
    const [keyboardOpen, setKeyboardOpen] = useState(false);
    // Bumped when AI/external content is applied to fade the content in.
    const [aiFadeKey, setAiFadeKey] = useState(0);
    useEffect(() => {
      const bump = () => setAiFadeKey((k) => k + 1);
      window.addEventListener("note:ai-applied", bump);
      return () => window.removeEventListener("note:ai-applied", bump);
    }, []);
    useEffect(() => {
      if (aiFadeKey === 0) return;
      const el = wrapperRef.current;
      if (!el) return;
      el.classList.remove("animate-ai-fade");
      // Force reflow so the animation restarts reliably.
      void el.getBoundingClientRect();
      el.classList.add("animate-ai-fade");
      const onEnd = () => el.classList.remove("animate-ai-fade");
      el.addEventListener("animationend", onEnd, { once: true });
      return () => el.removeEventListener("animationend", onEnd);
    }, [aiFadeKey]);
    const syncToContent = useSetAtom(syncEditorToContentAtom);
    const externalContent = useAtomValue(contentAtom);
    const setContent = useSetAtom(contentAtom);
    const aiEnabled = useAtomValue(aiEnabledAtom);
    const checkUnsaved = useSetAtom(checkUnsavedAtom);
    const { executeAction } = UseAIActions();
    const isPhone = useIsPhone();

    const [ctxMenu, setCtxMenu] = useState<
      | { open: false }
      | { open: true; x: number; y: number; anchor: "pointer" | "bottom"; sel: EditorSelection; prompting: boolean }
    >({ open: false });

    const closeCtxMenu = useCallback(() => setCtxMenu({ open: false }), []);

    const runSelectionAI = useCallback(
      async (action: string, sel: EditorSelection, instruction?: string) => {
        closeCtxMenu();
        // Keep selection visible while running.
        const ta = editorRef.current?.textarea as HTMLTextAreaElement | undefined;
        if (ta) {
          try {
            ta.focus({ preventScroll: true });
            ta.setSelectionRange(sel.start, sel.end);
          } catch {}
        }
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const result = await executeAction(action as any, sel.text, instruction, { noteContext: sel.base });
        if (result) {
          const next = applyReplacementToEditor(sel, result);
          if (next != null) {
            contentRef.current = next;
            setContent(next);
            checkUnsaved();
          } else {
            const ta = editorRef.current?.textarea as HTMLTextAreaElement | undefined;
            if (ta && ta.value !== sel.base) {
              toast.error("Selection changed — try again");
            } else {
              const full = applyToSelection(sel, result);
              contentRef.current = full;
              setContent(full);
              checkUnsaved();
            }
          }
        }
      },
      [closeCtxMenu, executeAction, setContent, checkUnsaved],
    );

    useEffect(() => {
      if (!ctxMenu.open) return;
      const onDown = (e: Event) => {
        const t = e.target as HTMLElement | null;
        if (t?.closest?.("[data-ai-ctx-menu]")) return;
        closeCtxMenu();
      };
      const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeCtxMenu(); };
      const onScroll = (e: Event) => {
        const target = e.target as HTMLElement | null;
        if (target?.closest?.("[data-ai-ctx-menu]")) return;
        if ((document.activeElement as HTMLElement | null)?.closest?.("[data-ai-ctx-menu]")) return;
        closeCtxMenu();
      };
      window.addEventListener("mousedown", onDown);
      window.addEventListener("touchstart", onDown, { passive: true });
      window.addEventListener("keydown", onKey);
      window.addEventListener("scroll", onScroll, true);
      return () => {
        window.removeEventListener("mousedown", onDown);
        window.removeEventListener("touchstart", onDown);
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("scroll", onScroll, true);
      };
    }, [ctxMenu.open, closeCtxMenu]);

    useEffect(() => {
      const host = wrapperRef.current;
      if (!host) return;
      const onContextMenu = (e: MouseEvent) => {
        if (!aiEnabled) return; // AI off => normal browser menu
        const sel = captureEditorSelection();
        if (!sel || !sel.text.trim()) return; // no selection => browser menu
        e.preventDefault();
        setCtxMenu({ open: true, x: e.clientX, y: e.clientY, anchor: "pointer", sel, prompting: false });
      };
      host.addEventListener("contextmenu", onContextMenu);
      return () => host.removeEventListener("contextmenu", onContextMenu);
    }, [aiEnabled]);

    // Track selection for AI targeting; on phone, surface the selection menu.
    useEffect(() => {
      let phoneTimer: number | undefined;
      const onSelectionChange = () => {
        const ta = editorRef.current?.textarea as HTMLTextAreaElement | undefined;
        // Only do work when the selection involves our editor.
        if (ta && (document.activeElement === ta || ta.selectionStart !== ta.selectionEnd)) {
          rememberEditorSelection();
        }
        if (!isPhone || !aiEnabled) return;
        if (phoneTimer) window.clearTimeout(phoneTimer);
        phoneTimer = window.setTimeout(() => {
          const active = document.activeElement as HTMLElement | null;
          if (active?.closest?.("[data-ai-ctx-menu]")) return;
          if (!ta) { setCtxMenu({ open: false }); return; }
          if (document.activeElement !== ta && !wrapperRef.current?.contains(document.activeElement)) return;
          // Use the live selection (not fallback memory) so the menu closes on deselect.
          if (document.activeElement === ta && ta.selectionStart !== ta.selectionEnd) {
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            const base = ta.value;
            const text = base.slice(start, end);
            if (text.trim()) {
              rememberEditorSelection();
              setCtxMenu({ open: true, x: 0, y: 0, anchor: "bottom", sel: { text, start, end, base }, prompting: false });
              return;
            }
          }
          setCtxMenu((m) => (m.open && m.anchor === "bottom" && !m.prompting ? { open: false } : m));
        }, 320);
      };
      document.addEventListener("selectionchange", onSelectionChange);
      return () => {
        if (phoneTimer) window.clearTimeout(phoneTimer);
        document.removeEventListener("selectionchange", onSelectionChange);
      };
    }, [isPhone, aiEnabled]);

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
     *
     * The checkbox's `change` event owns direct checkbox clicks. A separate
     * `click` handler on the preview root makes the whole task row togglable
     * (premium feel) — it skips the checkbox itself to avoid a double flip
     * and skips links so they still follow.
     */
    const handlePreviewTaskChange = useCallback((event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") {
        return;
      }
      const textarea = editorRef.current?.textarea as HTMLTextAreaElement | undefined;
      if (!textarea) return;
      const index = Number(target.dataset.taskIndex);
      if (!Number.isInteger(index)) return;
      toggleTaskByIndex(textarea, index);
    }, []);

    const handlePreviewTaskClick = useCallback((event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      // Native checkbox click is handled by the `change` path above.
      if (target instanceof HTMLInputElement && target.type === "checkbox") return;
      // Let links behave normally.
      if (target.closest("a")) return;
      const li = target.closest("li.task-list");
      if (!li) return;
      const box = li.querySelector<HTMLInputElement>('input[type="checkbox"]');
      if (!box) return;
      const index = Number(box.dataset.taskIndex);
      if (!Number.isInteger(index)) return;
      event.preventDefault();
      const textarea = editorRef.current?.textarea as HTMLTextAreaElement | undefined;
      if (textarea) toggleTaskByIndex(textarea, index);
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
    // dragging a slider would otherwise rebuild on every frame — but short,
    // since a long tail reflows the text after the reader has moved on.
    useEffect(() => {
      const instance = editorRef.current;
      if (!instance) return;
      const size = fontSize;
      const id = setTimeout(() => {
        const ta = instance.textarea as HTMLTextAreaElement | undefined;
        // The reflow moves the text out from under the caret, so keep the
        // reader's place across it rather than letting it land wherever the
        // new metrics happen to put it.
        const focused = !!ta && document.activeElement === ta;
        const start = ta?.selectionStart ?? 0;
        const end = ta?.selectionEnd ?? 0;
        const scrollTop = ta?.scrollTop ?? 0;

        instance.reinit({
          fontSize: `${size}px`,
          mobile: { fontSize: `${Math.max(12, size - 3)}px`, lineHeight: 1.5 },
        });
        if (instance.textarea) (instance.textarea as HTMLTextAreaElement).spellcheck = spellCheckRef.current;

        if (ta) {
          ta.setSelectionRange(start, end);
          if (focused) {
            ta.focus({ preventScroll: true });
          } else {
            // Untouched while the slider had focus, so leave it where the
            // reader was rather than yanking it back on the reflow.
            ta.scrollTop = scrollTop;
          }
        }
      }, 120);
      return () => clearTimeout(id);
    }, [fontSize]);

    // Apply spellcheck to the live editor textarea without rebuilding.
    useEffect(() => {
      const ta = editorRef.current?.textarea as HTMLTextAreaElement | undefined;
      if (ta) ta.spellcheck = spellCheck;
    }, [spellCheck]);

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
     * The command palette's Insert commands (date, time, code block,
     * horizontal line) splice at the caret. NoteContent owns the editor,
     * so the palette asks via a window event and this effect answers —
     * including switching out of preview first, where the hidden textarea
     * cannot take the focus execCommand needs.
     */
    useEffect(() => {
      const onInsert = (event: Event) => {
        const kind = (event as CustomEvent<string>).detail;
        const instance = editorRef.current;
        const textarea = instance?.textarea as HTMLTextAreaElement | undefined;
        if (!textarea) return;

        // Same engine as the toolbar's link button (Ctrl+K).
        if (kind === "link") {
          void instance.performAction("insertLink");
          return;
        }

        // Preview hides the textarea, so focus (and therefore the splice)
        // fails: return to the editor, then insert once the mode effect has
        // applied. The selection survives blurring, so the caret is where
        // the user last parked it.
        if (instance.container.dataset.mode === "preview") {
          toggleReadMode(); // preview -> edit
          setTimeout(() => {
            const text = insertionFor(kind, textarea);
            if (text !== null) insertAtCaret(textarea, text);
          }, 60);
          return;
        }

        const text = insertionFor(kind, textarea);
        if (text !== null) insertAtCaret(textarea, text);
      };

      window.addEventListener("note:insert", onInsert);
      return () => window.removeEventListener("note:insert", onInsert);
    }, [toggleReadMode]);

    /**
     * Ctrl+D toggles the todo marker on the current line (add/remove), like
     * the task-list tool. preventDefault stops the browser bookmark dialog.
     */
    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        if ((e.key !== "d" && e.key !== "D") || !(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
        const instance = editorRef.current;
        const textarea = instance?.textarea as HTMLTextAreaElement | undefined;
        if (!textarea) return;
        if (instance.container.dataset.mode === "preview") return;
        if (document.activeElement !== textarea) return;
        e.preventDefault();
        void instance.performAction("toggleTaskList").then(() => {
          textarea.focus();
        });
      };
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

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

    // Keyboard tracking. The visual viewport is the only signal that works on
    // both platforms, and the two report the keyboard differently: Android
    // shrinks the layout viewport, iOS overlays it. Recomputing on the visual
    // viewport (not just window resize) is what makes the toolbar appear at
    // all on iOS, where opening the keyboard fires no window resize.
    useEffect(() => {
      const vv = window.visualViewport;
      if (!vv) return;

      // Tallest layout viewport seen this session. Measuring the keyboard
      // against it is what tells the two platforms apart.
      let baseline = window.innerHeight;

      const syncKeyboard = () => {
        const host = wrapperRef.current ?? containerRef.current;
        if (!host) return;
        baseline = Math.max(baseline, window.innerHeight);

        // Keyboard height in CSS px, against that baseline.
        const overlay = Math.max(
          0,
          Math.round(baseline - vv.height - vv.offsetTop),
        );
        // When the layout viewport shrinks, the OS already handed the space
        // back and the note is not underneath the keyboard — so the toolbar
        // only needs a gap, and padding for the keyboard would take it twice.
        const layoutShrank = window.innerHeight < baseline - 24;
        const keyboard = layoutShrank ? 0 : overlay;

        // With no keyboard up, keep clear of the fixed action bar instead.
        // 48 ~= toolbar/bottom-bar height on phones.
        const reserved = overlay > 24 ? 0 : 48;
        host.style.setProperty("--ot-bottom-inset", `${keyboard + reserved}px`);

        // Only pad by what actually sits under the keyboard. Derived from the
        // container's own box so it cannot double count on a platform that
        // has already resized us.
        const rect = containerRef.current?.getBoundingClientRect();
        const covered = rect
          ? Math.min(overlay, Math.max(0, Math.round(rect.bottom - vv.height)))
          : 0;
        host.style.setProperty("--ot-keyboard", `${covered}px`);

        // Follow focus: the keyboard is opened to type. Keep the toolbar up
        // while a dropdown/menu is open (Radix portal) or a toolbar interaction
        // is in progress, so taps on toolbar actions don't collapse it.
        const typing =
          editorRef.current?.textarea === document.activeElement;
        const menuOpen = !!document.querySelector('[data-radix-popper-content-wrapper]');
        const toolbarActive = !!document.activeElement?.closest(".note-toolbar");
        const open = (typing || menuOpen || toolbarActive) && overlay > 24;
        setKeyboardOpen(open);
        document.documentElement.dataset.keyboard = open ? "open" : "closed";
      };

      // The keyboard is laid out after the focus change that asked for it, so
      // focus alone reports a viewport that has not moved yet.
      const onFocusChange = () => {
        syncKeyboard();
        requestAnimationFrame(syncKeyboard);
      };

      syncKeyboard();
      vv.addEventListener("resize", syncKeyboard);
      vv.addEventListener("scroll", syncKeyboard);
      window.addEventListener("resize", syncKeyboard);
      window.addEventListener("orientationchange", onFocusChange);
      document.addEventListener("focusin", onFocusChange);
      document.addEventListener("focusout", onFocusChange);
      return () => {
        vv.removeEventListener("resize", syncKeyboard);
        vv.removeEventListener("scroll", syncKeyboard);
        window.removeEventListener("resize", syncKeyboard);
        window.removeEventListener("orientationchange", onFocusChange);
        document.removeEventListener("focusin", onFocusChange);
        document.removeEventListener("focusout", onFocusChange);
        delete document.documentElement.dataset.keyboard;
      };
    }, []);

    // INIT EFFECT: Create editor on mount, re-create on theme change
    useEffect(() => {
      if (!containerRef.current) return;

      // Register the inline #tag renderer once; global by design.
      installTagSyntax();

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
          mobile: { fontSize: `${Math.max(12, fontSizeRef.current - 3)}px`, lineHeight: 1.5 },
          theme: { name: "minimal-hierarchy", colors, previewColors },
          smartLists: true,
          spellcheck: spellCheckRef.current,
          onRender: (previewEl: HTMLElement, mode: string) => {
            if (mode === "preview") stampTaskIndices(previewEl);
          },
        });

        editorRef.current = editorInstance;
        setEditor(editorInstance as ToolbarEditor);
        registerNoteEditor(editorInstance as ToolbarEditor);

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
        previewEl?.addEventListener("click", handlePreviewTaskClick as EventListener);

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
        registerNoteEditor(null);
        if (editorRef.current) {
          editorRef.current.destroy();
          editorRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resolvedTheme]);

    // Sync atom-driven content changes back into the editor. Fires for AI
    // rewrites only — note switches remount this component via `key`.
    useEffect(() => {
      if (!editorRef.current) return;
      const currentEditorValue = editorRef.current.getValue();
      if (externalContent === currentEditorValue) return;

      const instance = editorRef.current;
      isExternalUpdateRef.current = true;

      // Splice the rewrite into the textarea through the browser's editing
      // stack: select all, then execCommand. The rewrite then lands on the
      // native undo history as ONE step, so Cmd/Ctrl+Z walks straight back
      // from the AI output — same stack the toolbar and the OS menu use.
      // A plain `.value` assignment would discard that stack and strand the
      // caret wherever the engine parks it after the swap.
      const applyExternal = () => {
        const ta = instance.textarea as HTMLTextAreaElement | undefined;
        if (!ta) {
          instance.setValue(externalContent);
          return;
        }
        try { ta.focus({ preventScroll: true }); } catch {}
        try { ta.setSelectionRange(0, ta.value.length); } catch {}
        let ok = false;
        try {
          ok =
            externalContent === ""
              ? document.execCommand("delete")
              : document.execCommand("insertText", false, externalContent);
        } catch {
          ok = false;
        }
        if (!ok) {
          try {
            ta.setRangeText(externalContent, 0, ta.value.length, "end");
            ta.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: externalContent }));
            ok = true;
          } catch {
            ok = false;
          }
        }
        if (!ok) {
          // Last resort only: keeps content correct but native undo is lost.
          ta.value = externalContent;
          ta.dispatchEvent(new Event("input", { bubbles: true }));
        }
        // Keep OverType's internal state/preview in sync with the textarea.
        try { instance.updatePreview?.(); } catch {}
      };
      applyExternal();
      contentRef.current = externalContent;
      // Let OverType/native stack settle, then refresh undo/redo affordance.
      requestAnimationFrame(() => window.dispatchEvent(new CustomEvent("note:ai-applied")));
      requestAnimationFrame(() => {
        isExternalUpdateRef.current = false;
        window.dispatchEvent(new CustomEvent("note:history"));
      });
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
          data-preview-monochrome={previewColorsOn ? undefined : "true"}
          className="note-editor-container note-editor-host relative flex-1 min-h-0"
          style={{
            width: "100%",
            height: "100%",
            fontFamily: "'Jetbrains Mono', 'Space Mono', monospace",
            fontWeight: "800",
          }}
        />
        {/* #tag completion; anchored to this wrapper so the popover keeps
            position when the page around it scrolls. */}
        <TagAutocomplete editor={editor} viewMode={viewMode} anchor={wrapperRef} />
        {ctxMenu.open && (
          <div
            data-ai-ctx-menu
            className={
              ctxMenu.anchor === "bottom"
                ? "fixed inset-x-3 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-150"
                : "fixed z-[100] min-w-[200px] max-w-[min(22rem,calc(100vw-1rem))] animate-in fade-in zoom-in-95 duration-100"
            }
            style={
              ctxMenu.anchor === "bottom"
                ? { bottom: "calc(var(--ot-bottom-inset, 48px) + env(safe-area-inset-bottom, 0px) + 8px)" }
                : {
                    left: Math.max(8, Math.min(ctxMenu.x, (typeof window !== "undefined" ? window.innerWidth : ctxMenu.x) - 216)),
                    top: Math.max(8, Math.min(ctxMenu.y, (typeof window !== "undefined" ? window.innerHeight : ctxMenu.y) - 160)),
                  }
            }
            onContextMenu={(e) => e.preventDefault()}
          >
            <div
              role="menu"
              aria-label="Selection actions"
              className={`mx-auto max-w-md rounded-2xl border border-foreground/[0.06] bg-background p-1 shadow-none ${ctxMenu.anchor === "pointer" ? "max-h-[70vh] overflow-y-auto [scrollbar-width:thin]" : ""}`}
            >
              {!ctxMenu.prompting ? (
                <div className={ctxMenu.anchor === "bottom" ? "flex flex-wrap items-center justify-center gap-0.5" : "flex flex-col gap-0.5"}>
                  {(() => {
                    const item = ctxMenu.anchor === "bottom"
                      ? "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[13px] text-foreground/80 transition-colors active:bg-foreground/[0.06] sm:hover:bg-foreground/[0.05]"
                      : "flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-[13px] text-foreground/80 transition-colors hover:bg-foreground/[0.05]";
                    const icon = "size-[14px] shrink-0 text-foreground/55";
                    return (
                      <>
                        <button
                          type="button"
                          role="menuitem"
                          className={item}
                          onClick={async () => {
                            try { await navigator.clipboard.writeText(ctxMenu.sel.text); toast.success("Copied", { duration: 1200 }); } catch {}
                            closeCtxMenu();
                          }}
                        >
                          <SolarIcon icon="copy" className={icon} />
                          <span>Copy</span>
                        </button>
                        {([
                          ["summarize", "Summarize", "summarize"],
                          ["rewrite", "Rewrite", "rewrite"],
                          ["grammar", "Fix grammar", "grammar"],
                        ] as const).map(([action, label, iconId]) => (
                          <button
                            key={action}
                            type="button"
                            role="menuitem"
                            className={item}
                            onClick={() => void runSelectionAI(action, ctxMenu.sel)}
                          >
                            <SolarIcon icon={iconId as IconId} className={icon} />
                            <span>{label}</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          role="menuitem"
                          className={item}
                          onClick={() => setCtxMenu((m) => (m.open ? { ...m, prompting: true } : m))}
                        >
                          <SolarIcon icon="prompt" className={icon} />
                          <span>Prompt</span>
                        </button>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <SelectionPromptForm
                  isPhone={isPhone}
                  onBack={() => setCtxMenu((m) => (m.open ? { ...m, prompting: false } : m))}
                  onRun={(inst) => void runSelectionAI("edit", ctxMenu.sel, inst)}
                />
              )}
            </div>
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => prevProps.initialContent === nextProps.initialContent,
);
