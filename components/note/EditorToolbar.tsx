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
import { SolarIcon, type IconId } from "@/lib/icons";
import { HistoryControls } from "./HistoryControls";
import { AIMenu } from "./AIMenu";
import { SettingsMenu } from "./SettingsMenu";
import { cn } from "@/lib/utils";

/** Minimal shape of the OverType instance this toolbar drives. */
export interface ToolbarEditor {
  textarea: HTMLTextAreaElement;
  performAction(actionId: string): Promise<boolean>;
  insertAtCursor?(text: string): void;
}

export type ViewMode = "edit" | "plain" | "preview";

const VIEW_MODES: Record<
  ViewMode,
  { label: string; Icon: (props: { className?: string }) => React.ReactElement }
> = {
  edit: { label: "Edit", Icon: boundIcon("edit") },
  plain: { label: "Raw", Icon: boundIcon("plain") },
  preview: { label: "Preview", Icon: boundIcon("read") },
};

interface ToolbarButtonSpec {
  name: string;
  label: string;
  Icon: (props: { className?: string }) => React.ReactElement;
  actionId?: string;
  custom?: "strike" | "insertDate" | "insertTime" | "insertHr";
  format?: string;
}

function boundIcon(icon: IconId) {
  return function BoundSolarIcon({ className }: { className?: string }) {
    return <SolarIcon icon={icon} className={className} />;
  };
}

const GROUPS: ToolbarButtonSpec[][] = [
  [
    { name: "bold", label: "Bold (Ctrl+B)", Icon: boundIcon("bold"), actionId: "toggleBold", format: "bold" },
    { name: "italic", label: "Italic (Ctrl+I)", Icon: boundIcon("italic"), actionId: "toggleItalic", format: "italic" },
    { name: "strike", label: "Strikethrough", Icon: boundIcon("strike"), custom: "strike" },
    { name: "code", label: "Inline code", Icon: boundIcon("code"), actionId: "toggleCode" },
  ],
  [
    { name: "h1", label: "Heading 1", Icon: () => <span className="text-[13px] font-semibold leading-none">H1</span>, actionId: "toggleH1", format: "header" },
    { name: "h2", label: "Heading 2", Icon: () => <span className="text-[13px] font-semibold leading-none">H2</span>, actionId: "toggleH2", format: "header-2" },
    { name: "h3", label: "Heading 3", Icon: () => <span className="text-[13px] font-semibold leading-none">H3</span>, actionId: "toggleH3", format: "header-3" },
  ],
  [
    { name: "bulletList", label: "Bullet list", Icon: boundIcon("bulletList"), actionId: "toggleBulletList", format: "bullet-list" },
    { name: "orderedList", label: "Numbered list", Icon: boundIcon("numberedList"), actionId: "toggleNumberedList", format: "numbered-list" },
    { name: "taskList", label: "Task list", Icon: boundIcon("taskList"), actionId: "toggleTaskList", format: "task-list" },
    { name: "quote", label: "Quote", Icon: boundIcon("quote"), actionId: "toggleQuote", format: "quote" },
  ],
  [{ name: "link", label: "Insert link (Ctrl+K)", Icon: boundIcon("link"), actionId: "insertLink" }],
  [
    { name: "date", label: "Insert current date", Icon: boundIcon("date"), custom: "insertDate" },
    { name: "time", label: "Insert current time", Icon: boundIcon("time"), custom: "insertTime" },
  ],
  [{ name: "hr", label: "Insert horizontal rule", Icon: boundIcon("rule"), custom: "insertHr" }],
];

interface EditorToolbarProps {
  editor: ToolbarEditor | null;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  mobileVisible?: boolean;
}

export const EditorToolbar = memo(function EditorToolbar({
  editor,
  viewMode,
  onViewModeChange,
  mobileVisible = false,
}: EditorToolbarProps) {
  const [activeFormats, setActiveFormats] = useState<string[]>([]);
  const activeRef = useRef<string[]>([]);
  const [showFormats, setShowFormats] = useState(false);

  const refreshActiveFormats = useCallback(() => {
    if (!editor?.textarea) return;
    const next = markdownActions.getActiveFormats(editor.textarea);
    const prev = activeRef.current;
    if (next.length === prev.length && next.every((f, i) => f === prev[i])) return;
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

  useEffect(() => {
    if (viewMode !== "preview") refreshActiveFormats();
  }, [viewMode, refreshActiveFormats]);

  // When keyboard/toolbar hides, reset to action view so it reopens clean.
  useEffect(() => {
    if (!mobileVisible) setShowFormats(false);
  }, [mobileVisible]);

  const run = useCallback(
    (actionId: string) => {
      if (!editor) return;
      void editor.performAction(actionId).then(refreshActiveFormats);
    },
    [editor, refreshActiveFormats],
  );

  const strike = useCallback(() => {
    if (!editor?.textarea) return;
    const t = editor.textarea;
    t.focus();
    let start = t.selectionStart;
    let end = t.selectionEnd;
    if (start === end) {
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
    if (!ok) t.value = t.value.slice(0, start) + next + t.value.slice(end);
    const sel = toggling || !ok ? [start, start + next.length] : [start + 2, start + 2 + inner.length];
    t.setSelectionRange(sel[0], sel[1]);
    t.dispatchEvent(new Event("input", { bubbles: true }));
    refreshActiveFormats();
  }, [editor, refreshActiveFormats]);

  const insertText = useCallback(
    (text: string) => {
      if (!editor?.textarea) return;
      const t = editor.textarea;
      if (document.activeElement !== t) {
        t.focus();
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
      if (kind === "strike") return strike();
      if (kind === "insertHr") {
        const t = editor?.textarea;
        const before = t ? t.value.slice(0, t.selectionStart) : "";
        insertText(before === "" || before.endsWith("\n\n") ? "---\n\n" : "\n\n---\n\n");
        return;
      }
      const now = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      if (kind === "insertDate") insertText(`${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`);
      else insertText(`${p(now.getHours())}:${p(now.getMinutes())}`);
    },
    [strike, insertText, editor],
  );

  const switchView = useCallback((mode: ViewMode) => onViewModeChange(mode), [onViewModeChange]);

  const CurrentIcon = VIEW_MODES[viewMode].Icon;

  const formatGroups = (
    <>
      {GROUPS.map((group, gi) => (
        <div key={gi} className="flex shrink-0 items-center gap-1">
          {gi > 0 && <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-border" />}
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
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => (spec.custom ? customRun(spec.custom) : spec.actionId && run(spec.actionId))}
                className={cn(
                  "size-8 rounded-md text-muted-foreground/55 transition-colors",
                  "hover:bg-accent hover:text-foreground/90",
                  "data-[active]:bg-accent data-[active]:text-foreground",
                  "disabled:opacity-35",
                )}
              >
                <spec.Icon className="size-[15px]" />
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
            className="size-8 shrink-0 rounded-md text-muted-foreground/55 transition-colors hover:bg-accent hover:text-foreground/90"
          >
            <CurrentIcon className="size-[15px]" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" sideOffset={8} collisionPadding={12} className="w-32 rounded-xl">
          <DropdownMenuRadioGroup value={viewMode} onValueChange={(v) => switchView(v as ViewMode)}>
            {(Object.keys(VIEW_MODES) as ViewMode[]).map((mode) => {
              const { label, Icon } = VIEW_MODES[mode];
              return (
                <DropdownMenuRadioItem key={mode} value={mode} className="flex items-center justify-between gap-2 text-sm">
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
    </>
  );

  const actionButtons = (
    <>
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
        <SolarIcon icon="save" className="size-4" />
      </Button>
      <HistoryControls />
      <AIMenu />
      <SettingsMenu />
    </>
  );

  return (
    <div
      role="toolbar"
      aria-label="Formatting toolbar"
      data-mobile-visible={mobileVisible || undefined}
      className="note-toolbar w-full px-2 py-1.5"
    >
      {/* Desktop: single row, format tools + view (actions live in headers/bars). */}
      <div className="hidden w-full items-center gap-1 overflow-x-auto [overscroll-behavior-x:contain] [scrollbar-width:none] md:flex [&::-webkit-scrollbar]:hidden" style={{ justifyContent: "safe center" }}>
        {formatGroups}
      </div>

      {/* Phone (keyboard open): actions by default; "T" toggles to scrollable
          format icons sliding in from the right over the actions; "×" slides
          back. The toggle stays pinned at the right edge. */}
      <div className="relative flex w-full items-center md:hidden">
        <div
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [overscroll-behavior-x:contain] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-transform duration-200 ease-out",
            showFormats ? "translate-x-0" : "translate-x-0",
          )}
          aria-hidden={showFormats}
        >
          {!showFormats && <div className="flex w-full items-center justify-evenly gap-1">{actionButtons}</div>}
        </div>

        {/* Format layer slides in from the right, overlapping actions. */}
        <div
          className={cn(
            "absolute inset-y-0 right-10 left-0 flex items-center gap-1 overflow-x-auto [overscroll-behavior-x:contain] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-background transition-all duration-200 ease-out",
            showFormats ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-6 opacity-0",
          )}
          aria-hidden={!showFormats}
        >
          {showFormats ? formatGroups : null}
        </div>

        <button
          type="button"
          aria-label={showFormats ? "Show actions" : "Show formatting"}
          title={showFormats ? "Actions" : "Formatting"}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShowFormats((v) => !v)}
          className={cn(
            "ml-1 flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-all duration-200 hover:bg-accent hover:text-foreground",
            showFormats && "rotate-0 text-foreground",
          )}
        >
          {showFormats ? (
            <SolarIcon icon="close" className="size-4" />
          ) : (
            <span className="text-[13px] font-bold leading-none">T</span>
          )}
        </button>
      </div>
    </div>
  );
});
