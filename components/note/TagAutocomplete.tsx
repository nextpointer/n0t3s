"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { allTagsAtom, type ViewMode } from "@/store/noteAtom";
import { getTagTriggerAt } from "@/lib/tag-syntax";
import type { ToolbarEditor } from "./EditorToolbar";

const MAX_ITEMS = 8;

/**
 * Caret pixel position inside an overlay textarea.
 *
 * Standard mirror trick: clone the box, walk the text up to the offset, and
 * read where the terminator lands. OverType keeps preview and textarea
 * pixel-aligned, and the same metrics on the mirror reproduce the wrap.
 * The mirror element is cached — building it per keystroke churned DOM.
 */
const MIRROR_STYLE_KEYS = [
  "boxSizing",
  "fontFamily",
  "fontStyle",
  "fontSize",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "whiteSpace",
  "wordWrap",
  "overflowWrap",
  "tabSize",
  "textIndent",
] as const;

let caretMirror: HTMLDivElement | null = null;

function measureCaret(
  textarea: HTMLTextAreaElement,
  offset: number,
): { x: number; y: number; height: number } {
  if (!caretMirror) caretMirror = document.createElement("div");
  const mirror = caretMirror;
  const cs = getComputedStyle(textarea);

  mirror.textContent = "";
  Object.assign(mirror.style, {
    position: "absolute",
    visibility: "hidden",
    left: "-9999px",
    top: "0",
    margin: "0",
    border: "0",
    width: `${textarea.clientWidth}px`,
  });
  for (const key of MIRROR_STYLE_KEYS) {
    mirror.style[key] = cs[key];
  }

  mirror.textContent = textarea.value.slice(0, offset);
  const marker = document.createElement("span");
  // Zero-width content still produces a box, which is what we measure.
  marker.textContent = "\u200b";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const result = {
    x: marker.offsetLeft,
    y: marker.offsetTop,
    height: parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.6,
  };
  document.body.removeChild(mirror);
  return result;
}

interface PopoverState {
  items: string[];
  active: number;
  /** Offset of the `#` that opened the popover, in the textarea value. */
  triggerStart: number;
  x: number;
  y: number;
}

/**
 * Obsidian-style tag completion.
 *
 * Listens directly to the editor textarea: typing after a word-boundary `#`
 * opens a popover with tags gathered from every note. Keys are claimed on a
 * capturing textarea listener so OverType's own shortcut handling (bubble
 * phase on the document) never sees Enter, Tab or the arrows.
 */
export function TagAutocomplete({
  editor,
  viewMode,
  anchor,
}: {
  editor: ToolbarEditor | null;
  viewMode: ViewMode;
  /** The positioned ancestor the popover is rendered inside. */
  anchor: React.RefObject<HTMLElement | null>;
}) {
  const suggestions = useAtomValue(allTagsAtom);
  const [state, setState] = useState<PopoverState | null>(null);

  // Latest values for the capturing keydown listener, which must not be
  // rebuilt on every keystroke.
  const stateRef = useRef<PopoverState | null>(null);
  stateRef.current = state;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  textareaRef.current = editor?.textarea ?? null;

  const close = useCallback(() => {
    stateRef.current = null;
    setState(null);
  }, []);

  const open = useCallback(
    (textarea: HTMLTextAreaElement) => {
      const caret = textarea.selectionStart;
      const trigger = getTagTriggerAt(textarea.value, caret);
      if (!trigger) {
        close();
        return;
      }
      const query = trigger.query.toLowerCase();
      const starts: string[] = [];
      const contains: string[] = [];
      for (const tag of suggestions) {
        if (!query || tag.startsWith(query)) {
          if (tag !== query) starts.push(tag);
        } else if (tag.includes(query)) {
          contains.push(tag);
        }
      }
      const items = [...starts, ...contains].slice(0, MAX_ITEMS);
      if (items.length === 0) {
        close();
        return;
      }

      // Caret position on screen -> popover position inside the anchor.
      const anchorEl = anchor.current;
      if (!anchorEl) {
        close();
        return;
      }
      const caretBox = measureCaret(textarea, caret);
      const taRect = textarea.getBoundingClientRect();
      const anchorRect = anchorEl.getBoundingClientRect();
      const x = taRect.left + caretBox.x - textarea.scrollLeft - anchorRect.left;
      const rawY = taRect.top + caretBox.y - textarea.scrollTop - anchorRect.top;
      // Measured popover height is over-estimated; fine for flipping.
      const popoverHeight = 30 * items.length + 8;
      const maxBottom = anchorRect.height - popoverHeight - 8;
      // Below the caret when it fits, otherwise above it, clamped to the box.
      const y = Math.min(
        Math.max(rawY + caretBox.height + 6, 8),
        Math.max(maxBottom, 8),
      );

      stateRef.current = { items, active: 0, triggerStart: trigger.start, x, y };
      setState(stateRef.current);
    },
    [anchor, close, suggestions],
  );

  const accept = useCallback(
    (tag: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const caret = textarea.selectionStart;
      const trigger = getTagTriggerAt(textarea.value, caret);
      if (!trigger) {
        close();
        return;
      }
      // The trailing space ends the token; tags have no closing bracket.
      textarea.setRangeText(`#${tag} `, trigger.start, caret, "end");
      // OverType's document-level input listener picks the change up from
      // here: preview re-render, onChange, atom sync, autosave.
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.focus();
      close();
    },
    [close],
  );
  // The popover buttons and the keydown listener both insert; keep one
  // source of truth for the listener that is built once.
  const acceptRef = useRef(accept);
  acceptRef.current = accept;

  // Re-evaluate on typing and caret movement.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const evaluate = () => {
      // Only the author's own typing may open the popover.
      if (document.activeElement !== textarea || viewMode === "preview") {
        close();
        return;
      }
      open(textarea);
    };

    const onSelectionChange = () => {
      if (document.activeElement === textarea) evaluate();
    };
    // Keep an open popover glued to its caret while the text scrolls.
    const onScroll = () => {
      // Any scroll that moves the caret (editor, page) re-pins the popover.
      if (stateRef.current) evaluate();
    };

    textarea.addEventListener("input", evaluate);
    document.addEventListener("scroll", onScroll, { capture: true });
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      textarea.removeEventListener("input", evaluate);
      document.removeEventListener("scroll", onScroll, { capture: true });
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, [anchor, open, close, viewMode, editor]);

  // Keys. Open capture-phase listener on the textarea preempts OverType's
  // document-level shortcut handling.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const current = stateRef.current;
      if (!current) return;
      // Catch none — window-level app shortcuts still own blocked keys.
      if (e.isComposing) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.key === "ArrowDown" ? 1 : -1;
        const active = (current.active + delta + current.items.length) % current.items.length;
        stateRef.current = { ...current, active };
        setState(stateRef.current);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        acceptRef.current(current.items[current.active]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };

    textarea.addEventListener("keydown", onKeyDown, true);
    return () => textarea.removeEventListener("keydown", onKeyDown, true);
  }, [editor, close]);

  // Modes without visible caret and any suggestion refresh close cleanly.
  useEffect(() => {
    if (viewMode === "preview") close();
  }, [viewMode, editor, close]);

  if (!state) return null;

  return (
    <div
      role="listbox"
      aria-label="Tag suggestions"
      style={{ left: state.x, top: state.y }}
      className="absolute z-60 max-h-60 w-max max-w-56 overflow-y-auto rounded-xl border border-border bg-popover py-1 shadow-md"
    >
      {state.items.map((tag, index) => (
        <button
          key={tag}
          type="button"
          role="option"
          aria-selected={index === state.active}
          data-active={index === state.active}
          onMouseDown={(e) => {
            // Keep the textarea focused; the button only clicks.
            e.preventDefault();
          }}
          onClick={() => acceptRef.current(tag)}
          className="block w-full cursor-pointer px-3 py-1.5 text-left font-mono text-xs text-foreground/70 hover:bg-accent/40 hover:text-foreground data-[active=true]:bg-accent/40 data-[active=true]:text-foreground"
        >
          #{tag}
        </button>
      ))}
    </div>
  );
}
