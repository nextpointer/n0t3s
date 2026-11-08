"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { markdownActions } from "overtype";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BoldIcon,
  BulletListIcon,
  CodeIcon,
  EyeIcon,
  ItalicIcon,
  LinkIcon,
  OrderedListIcon,
  PencilIcon,
  PlainTextIcon,
  QuoteIcon,
  TaskListIcon,
} from "@/components/icons/EditorIcons";
import { CalendarDays, Clock, Minus, Save, Strikethrough } from "lucide-react";
import { HistoryControls } from "./HistoryControls";
import { AIMenu } from "./AIMenu";
import { SettingsMenu } from "./SettingsMenu";
import { cn } from "@/lib/utils";

/** Minimal shape of the OverType instance this toolbar drives. */
export interface ToolbarEditor {
  textarea: HTMLTextAreaElement;
  performAction(actionId: string): Promise<boolean>;
  /** Present on the real OverType instance; typed separately because spec
      buttons only need the markdown-action surface. */
  insertAtCursor?(text: string): void;
}

export type ViewMode = "edit" | "plain" | "preview";

const VIEW_MODES: Record<
  ViewMode,
  { label: string; Icon: (props: { className?: string }) => React.ReactElement }
> = {
  edit: { label: "Edit", Icon: PencilIcon },
  plain: { label: "Raw", Icon: PlainTextIcon },
  preview: { label: "Preview", Icon: EyeIcon },
};

interface ToolbarButtonSpec {
  name: string;
  label: string;
  Icon: (props: { className?: string }) => React.ReactElement;
  /** OverType action id from `defaultToolbarButtons` (drives shortcuts too).
      Omit for `custom` buttons. */
  actionId?: string;
  /** Named handler resolved by the component — tools that aren't
      markdown-actions (strikethrough, stamps, rule, etc.). */
  custom?: "strike" | "insertDate" | "insertTime" | "insertHr";
  /** Key in the `markdownActions.getActiveFormats()` result */
  format?: string;
}

/** lucide icons don't quite match the hand-drawn signature; the wrappers
    adapt them to the same `Icon` contract the local EditorIcons use. */
const StrikeIcon = (props: { className?: string }) => <Strikethrough {...props} />;
const DateIcon = (props: { className?: string }) => <CalendarDays {...props} />;
const TimeIcon = (props: { className?: string }) => <Clock {...props} />;
const HrIcon = (props: { className?: string }) => <Minus {...props} />;

const GROUPS: ToolbarButtonSpec[][] = [
  [
    { name: "bold", label: "Bold (Ctrl+B)", Icon: BoldIcon, actionId: "toggleBold", format: "bold" },
    { name: "italic", label: "Italic (Ctrl+I)", Icon: ItalicIcon, actionId: "toggleItalic", format: "italic" },
    // No action id ships for strike, but the renderer parses ~~tildes~~ —
    // applyCustomFormat is OverType's own extension point for it.
    { name: "strike", label: "Strikethrough", Icon: StrikeIcon, custom: "strike" },
    { name: "code", label: "Inline code", Icon: CodeIcon, actionId: "toggleCode" },
  ],
  [
    { name: "h1", label: "Heading 1", Icon: () => <span className="text-[13px] leading-none font-semibold">H1</span>, actionId: "toggleH1", format: "header" },
    { name: "h2", label: "Heading 2", Icon: () => <span className="text-[13px] leading-none font-semibold">H2</span>, actionId: "toggleH2", format: "header-2" },
    { name: "h3", label: "Heading 3", Icon: () => <span className="text-[13px] leading-none font-semibold">H3</span>, actionId: "toggleH3", format: "header-3" },
  ],
  [
    { name: "bulletList", label: "Bullet list", Icon: BulletListIcon, actionId: "toggleBulletList", format: "bullet-list" },
    { name: "orderedList", label: "Numbered list", Icon: OrderedListIcon, actionId: "toggleNumberedList", format: "numbered-list" },
    { name: "taskList", label: "Task list", Icon: TaskListIcon, actionId: "toggleTaskList", format: "task-list" },
    { name: "quote", label: "Quote", Icon: QuoteIcon, actionId: "toggleQuote", format: "quote" },
  ],
  [{ name: "link", label: "Insert link (Ctrl+K)", Icon: LinkIcon, actionId: "insertLink" }],
  [
    { name: "date", label: "Insert current date", Icon: DateIcon, custom: "insertDate" },
    { name: "time", label: "Insert current time", Icon: TimeIcon, custom: "insertTime" },
  ],
  [{ name: "hr", label: "Insert horizontal rule", Icon: HrIcon, custom: "insertHr" }],
];

interface EditorToolbarProps {
  editor: ToolbarEditor | null;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  /**
   * Phones only: the keyboard is covering the screen. The toolbar is pinned
   * above the keyboard, so it is hidden whenever the keyboard is down rather
   * than sitting over the note.
   */
  mobileVisible?: boolean;
}

export const EditorToolbar = memo(function EditorToolbar({
  editor,
  viewMode,
  onViewModeChange,
  mobileVisible = false,
}: EditorToolbarProps) {
  const [activeFormats, setActiveFormats] = useState<string[]>([]);
  // Cheap guard so we don't setState on every selection tick.
  const activeRef = useRef<string[]>([]);

  const refreshActiveFormats = useCallback(() => {
    if (!editor?.textarea) return;
    const next = markdownActions.getActiveFormats(editor.textarea);
    const prev = activeRef.current;
    if (
      next.length === prev.length &&
      next.every((f, i) => f === prev[i])
    ) {
      return;
    }
    activeRef.current = next;
    setActiveFormats(next);
  }, [editor]);

  useEffect(() => {
    if (!editor?.textarea) return;
    const el = editor.textarea;
    refreshActiveFormats();
    el.addEventListener("input", refreshActiveFormats);
    el.addEventListener("keyup", refreshActiveFormats);
    el.addEventListener("click", refreshActiveFormats);
    el.addEventListener("focus", refreshActiveFormats);
    document.addEventListener("selectionchange", refreshActiveFormats);
    return () => {
      el.removeEventListener("input", refreshActiveFormats);
      el.removeEventListener("keyup", refreshActiveFormats);
      el.removeEventListener("click", refreshActiveFormats);
      el.removeEventListener("focus", refreshActiveFormats);
      document.removeEventListener("selectionchange", refreshActiveFormats);
    };
  }, [editor, refreshActiveFormats]);

  // Only meaningful in edit/raw mode, where the caret exists.
  useEffect(() => {
    if (viewMode !== "preview") refreshActiveFormats();
  }, [viewMode, refreshActiveFormats]);

  const run = useCallback(
    (actionId: string) => {
      if (!editor) return;
      // performAction() focuses the textarea for us, which keeps the caret.
      void editor.performAction(actionId).then(refreshActiveFormats);
    },
    [editor, refreshActiveFormats],
  );

  // OverType ships no strikethrough action id, though its renderer parses
  // ~~tildes~~. calling markdownActions.applyCustomFormat here silently
  // killed the textarea's native undo stack for every later edit (its
  // internals probe with a contentEditable toggle and fall through to
  // value splices), so the wrap is done with one plain execCommand
  // instead — it stays in the system undo history like a keystroke and
  // OverType re-renders off the input event it fires.
  const strike = useCallback(() => {
    if (!editor?.textarea) return;
    const t = editor.textarea;
    t.focus({ preventScroll: true });
    let start = t.selectionStart;
    let end = t.selectionEnd;
    if (start === end) {
      // nothing selected: wrap the word under the caret
      const value = t.value;
      while (start > 0 && !/\s/.test(value[start - 1])) start--;
      while (end < value.length && !/\s/.test(value[end])) end++;
      t.setSelectionRange(start, end);
    }
    const inner = t.value.slice(start, end);
    const toggling = inner.startsWith("~~") && inner.endsWith("~~") && inner.length >= 4;
    const next = toggling ? inner.slice(2, -2) : `~~${inner}~~`;
    let ok;
    try {
      ok = document.execCommand("insertText", false, next);
    } catch {
      ok = false;
    }
    if (!ok) {
      // execCommand unavailable in this browser: direct splice (loses the
      // undo entry, keeps the edit), still synced through the input event.
      t.value = t.value.slice(0, start) + next + t.value.slice(end);
    }
    // Select the (un)wrapped inner text so a second click toggles it back.
    const sel =
      toggling || !ok
        ? [start, start + next.length]
        : [start + 2, start + 2 + inner.length];
    t.setSelectionRange(sel[0], sel[1]);
    t.dispatchEvent(new Event("input", { bubbles: true }));
    refreshActiveFormats();
  }, [editor, refreshActiveFormats]);

  // Text insertion shared by the stamp/rule buttons. Contract: while the
  // caret is in the editor insert at the caret; when it is not, append
  // after the text — a textarea silently keeps a stale selection from its
  // last focused state, so the caret is explicitly parked at the end
  // first. The instance's insertAtCursor execCommands first (native undo
  // + input event) and splices-and-dispatches itself as fallback.
  const insertText = useCallback(
    (text: string) => {
      if (!editor?.textarea) return;
      const t = editor.textarea;
      if (document.activeElement !== t) {
        t.focus({ preventScroll: true });
        t.setSelectionRange(t.value.length, t.value.length);
      }
      if (editor.insertAtCursor) {
        editor.insertAtCursor(text);
      } else {
        const start = t.selectionStart;
        const end = t.selectionEnd;
        t.value = t.value.slice(0, start) + text + t.value.slice(end);
        t.setSelectionRange(start + text.length, start + text.length);
        t.dispatchEvent(new Event("input", { bubbles: true }));
      }
      refreshActiveFormats();
    },
    [editor, refreshActiveFormats],
  );

  const customRun = useCallback(
    (kind: "strike" | "insertDate" | "insertTime" | "insertHr") => {
      if (kind === "strike") {
        strike();
        return;
      }
      if (kind === "insertHr") {
        // Markdown rules render per line: pad thick with blank lines only
        // when the caret doesn't already start an empty one.
        const t = editor?.textarea;
        const before = t ? t.value.slice(0, t.selectionStart) : "";
        insertText(before === "" || before.endsWith("\n\n") ? "---\n\n" : "\n\n---\n\n");
        return;
      }
      const now = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      if (kind === "insertDate") {
        insertText(`${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`);
      } else {
        insertText(`${p(now.getHours())}:${p(now.getMinutes())}`);
      }
    },
    [strike, insertText, editor],
  );

  const switchView = useCallback(
    (mode: ViewMode) => {
      // NoteContent owns the editor switch so the keyboard shortcut and the
      // command palette go through exactly the same path.
      onViewModeChange(mode);
    },
    [onViewModeChange],
  );

  const CurrentIcon = VIEW_MODES[viewMode].Icon;

  return (
    <div
      role="toolbar"
      aria-label="Formatting toolbar"
      data-mobile-visible={mobileVisible || undefined}
      className="note-toolbar flex w-full items-center gap-1 overflow-x-auto [overscroll-behavior-x:contain] px-1.5 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {GROUPS.map((group, gi) => (
        <div key={gi} className="flex shrink-0 items-center gap-1">
          {gi > 0 && (
            <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-border" />
          )}
          {group.map((spec) => {
            const isActive = spec.format ? activeFormats.includes(spec.format) : false;
            return (
              <Button
                key={spec.name}
                type="button"
                variant="ghost"
                size="icon"
                title={spec.label}
                aria-label={spec.label}
                aria-pressed={spec.format ? isActive : undefined}
                data-active={isActive || undefined}
                disabled={!editor}
                // Keep the caret: without this the textarea blurs and the
                // selection that markdown-actions reads is lost.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  spec.custom ? customRun(spec.custom) : spec.actionId && run(spec.actionId)
                }
                className={cn(
                  "size-8 rounded-md text-muted-foreground transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "data-[active]:bg-accent data-[active]:text-accent-foreground",
                  "disabled:opacity-40",
                )}
              >
                <spec.Icon className="size-4" />
              </Button>
            );
          })}
        </div>
      ))}

      <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-border" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title={`View: ${VIEW_MODES[viewMode].label}`}
            aria-label={`View mode: ${VIEW_MODES[viewMode].label}`}
            onMouseDown={(e) => e.preventDefault()}
            className="size-8 shrink-0 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <CurrentIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32 rounded-xl">
          <DropdownMenuRadioGroup
            value={viewMode}
            onValueChange={(v) => switchView(v as ViewMode)}
          >
            {(Object.keys(VIEW_MODES) as ViewMode[]).map((mode) => {
              const { label, Icon } = VIEW_MODES[mode];
              return (
                <DropdownMenuRadioItem
                  key={mode}
                  value={mode}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="size-4" />
                    {label}
                  </span>
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Phones only: the note-level actions the top header hosts, trailing
          the format groups so the strip scrolls — with the platform's own
          rubber-band at the edges — to reach them. Window save/listener
          components are the exact instances the header renders, so state
          (autosave toggles, AI loading) stays in one place. */}
      <div className="md:hidden flex shrink-0 items-center gap-1" aria-label="Note actions">
        <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-border" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Save (Ctrl/Cmd+S)"
          aria-label="Save"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => window.dispatchEvent(new CustomEvent("note:save"))}
          className="size-8 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <Save className="size-4" />
        </Button>
        <HistoryControls />
        <AIMenu />
        <SettingsMenu />
      </div>
    </div>
  );
});