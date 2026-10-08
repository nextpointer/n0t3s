"use client";

import { memo, useCallback, useEffect, useRef } from "react";

interface CustomCaretProps {
  /** The OverType textarea the caret belongs to. */
  textarea: HTMLTextAreaElement | null;
}

/**
 * Replaces the native caret with a slim bar spanning the full line height.
 *
 * OverType draws the text in a preview layer and hides the real characters in
 * the textarea that sits on top of it, so both share identical monospace
 * metrics. That means the caret position can be measured exactly by replaying
 * the text up to the caret into an off-screen mirror of the same box.
 */
export const CustomCaret = memo(function CustomCaret({ textarea }: CustomCaretProps) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const mirrorRef = useRef<HTMLDivElement | null>(null);

  const position = useCallback(() => {
    const bar = barRef.current;
    const mirror = mirrorRef.current;
    if (!bar || !mirror || !textarea) return;

    // The blink is a CSS animation on `opacity`, and animations win over the
    // inline style — so hiding must also stop the animation.
    const hide = () => {
      bar.style.animation = "none";
      bar.style.opacity = "0";
    };

    // Preview mode hides the textarea (display:none) but it can still hold
    // focus, so the activeElement check alone is not enough.
    if (getComputedStyle(textarea).display === "none") return hide();
    if (document.activeElement !== textarea) return hide();

    const caret = textarea.selectionStart ?? 0;
    const before = textarea.value.slice(0, caret);
    // Split so the character slot at the caret is empty and measurable.
    const lineStart = before.lastIndexOf("\n") + 1;
    const columnText = before.slice(lineStart);

    mirror.textContent = "";
    const head = document.createTextNode(before.slice(0, lineStart));
    const col = document.createTextNode(columnText);
    const mark = document.createElement("span");
    mark.textContent = "\u200b";
    mirror.appendChild(head);
    mirror.appendChild(col);
    mirror.appendChild(mark);

    // The mirror must match the textarea's box exactly, because the overlay
    // technique depends on identical monospace metrics on both layers.
    const cs = getComputedStyle(textarea);
    mirror.style.font = cs.font;
    mirror.style.letterSpacing = cs.letterSpacing;
    mirror.style.padding = cs.padding;
    mirror.style.lineHeight = cs.lineHeight;
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.wordBreak = "break-word";
    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.left = "0";
    mirror.style.top = `${-textarea.scrollTop}px`;
    mirror.style.width = `${textarea.clientWidth}px`;

    const lineHeight = (() => {
      const lh = parseFloat(getComputedStyle(textarea).lineHeight);
      return Number.isFinite(lh) && lh > 0 ? lh : 20;
    })();

    const marker = mark.getBoundingClientRect();
    const host = textarea.getBoundingClientRect();

    // Zero-based visual line of the caret: count the newlines before it.
    const lineIndex = (before.slice(0, lineStart).match(/\n/g) || []).length;
    const left = marker.left - host.left + textarea.scrollLeft;
    const top = lineIndex * lineHeight - textarea.scrollTop;

    bar.style.transform = `translate(${Math.max(0, left)}px, ${top}px)`;
    bar.style.height = `${lineHeight}px`;
    bar.style.opacity = "1";
    bar.style.animation = "none";
    void bar.offsetWidth;
    bar.style.animation = "";
  }, [textarea]);

  useEffect(() => {
    if (!textarea) return;

    const update = () => position();
    textarea.addEventListener("input", update);
    textarea.addEventListener("click", update);
    textarea.addEventListener("keyup", update);
    textarea.addEventListener("scroll", update, { passive: true });
    textarea.addEventListener("blur", update);
    textarea.addEventListener("focus", update);
    document.addEventListener("selectionchange", update);
    window.addEventListener("resize", update);

    const raf = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(raf);
      textarea.removeEventListener("input", update);
      textarea.removeEventListener("click", update);
      textarea.removeEventListener("keyup", update);
      textarea.removeEventListener("scroll", update);
      textarea.removeEventListener("blur", update);
      textarea.removeEventListener("focus", update);
      document.removeEventListener("selectionchange", update);
      window.removeEventListener("resize", update);
    };
  }, [textarea, position]);

  return (
    <>
      <div
        ref={barRef}
        aria-hidden
        className="note-caret pointer-events-none absolute left-0 top-0 z-[5] w-[2px] opacity-0 rounded-full"
      />
      <div ref={mirrorRef} aria-hidden className="pointer-events-none" />
    </>
  );
});