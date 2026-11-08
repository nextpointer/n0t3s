"use client";

import { memo, useCallback, useState } from "react";
import { useAtom } from "jotai";
import { SolarIcon } from "@/lib/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SheetLite } from "@/components/ui/sheet-lite";
import { ElasticSlider } from "@/components/ui/elastic-slider";
import { useIsPhone } from "@/hooks/use-is-phone";
import {
  autoSaveAtom,
  aiEnabledAtom,
  previewColorsAtom,
  editorFontSizeAtom,
  toolbarEnabledAtom,
  persistAutoSave,
  persistAiEnabled,
  persistPreviewColors,
  persistEditorFontSize,
  persistToolbarEnabled,
} from "@/store/noteAtom";

/**
 * Editor preferences — everything about how the writing surface looks and
 * behaves (font size, toolbar visibility, auto-save, preview colours,
 * turning AI off). Deliberately separate from the Settings menu, which
 * stays the destructive/document-level pair (export, delete): these two
 * serve different intents and used to fight for the same surface, so a
 * font-size correction involved scrolling past "Delete Note".
 */
export const ConfigMenu = memo(function ConfigMenu() {
  const [autoSave, setAutoSave] = useAtom(autoSaveAtom);
  const [aiEnabled, setAiEnabled] = useAtom(aiEnabledAtom);
  const [previewColors, setPreviewColors] = useAtom(previewColorsAtom);
  const [fontSize, setFontSize] = useAtom(editorFontSizeAtom);
  const [toolbarEnabled, setToolbarEnabled] = useAtom(toolbarEnabledAtom);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isPhone = useIsPhone();

  const handleAutoSaveChange = useCallback((value: boolean) => {
    setAutoSave(value);
    persistAutoSave(value);
  }, [setAutoSave]);

  const handleAiChange = useCallback((value: boolean) => {
    setAiEnabled(value);
    persistAiEnabled(value);
  }, [setAiEnabled]);

  const handlePreviewColors = useCallback((value: boolean) => {
    setPreviewColors(value);
    persistPreviewColors(value);
  }, [setPreviewColors]);

  const handleFontSize = useCallback((value: number) => {
    setFontSize(value);
    persistEditorFontSize(value);
  }, [setFontSize]);

  const handleToolbarToggle = useCallback((value: boolean) => {
    setToolbarEnabled(value);
    persistToolbarEnabled(value);
  }, [setToolbarEnabled]);

  // One control surface for the desktop dropdown and the phone sheet —
  // one spacing rhythm, one source for every atom.
  const rows = (
    <div className="px-1.5 pt-3 pb-1">
      <div className="px-2.5 pb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40">
        Config
      </div>
      <div className="px-2.5 pt-1 pb-4">
        <ElasticSlider
          label="Font size"
          formatValue={(v) => `${v}px`}
          min={12}
          max={22}
          step={1}
          value={fontSize}
          onValueChange={handleFontSize}
        />
      </div>
      <div className="flex items-center justify-between gap-6 px-2.5 py-2.5">
        <Label htmlFor="show-toolbar" className="text-sm">
          Show toolbar
        </Label>
        <Switch
          id="show-toolbar"
          checked={toolbarEnabled}
          onCheckedChange={handleToolbarToggle}
          title="The formatting pill between the title and the text."
        />
      </div>
      <div className="flex items-center justify-between gap-6 px-2.5 py-2.5">
        <Label htmlFor="config-auto-save" className="text-sm">
          Auto Save
        </Label>
        <Switch
          id="config-auto-save"
          checked={autoSave}
          onCheckedChange={handleAutoSaveChange}
        />
      </div>
      <div className="flex items-center justify-between gap-6 px-2.5 py-2.5">
        <Label htmlFor="config-preview-colors" className="text-sm">
          Preview colours
        </Label>
        <Switch
          id="config-preview-colors"
          checked={previewColors}
          onCheckedChange={handlePreviewColors}
          title="Coloured headings and emphasis in preview. Code blocks stay highlighted either way."
        />
      </div>
      <div className="flex items-center justify-between gap-6 px-2.5 py-2.5">
        <Label htmlFor="config-ai-enabled" className="text-sm">
          No AI
        </Label>
        <Switch
          id="config-ai-enabled"
          checked={!aiEnabled}
          onCheckedChange={(on) => handleAiChange(!on)}
        />
      </div>
    </div>
  );

  if (isPhone) {
    return (
      <>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="Config"
          title="Config (font, toolbar, saves, colours)"
          className="cursor-pointer rounded-full p-3 md:mt-10 md:p-0.5"
        >
          <SolarIcon icon="config" className="size-4 pointer-events-none text-foreground/70" />
        </button>
        <SheetLite
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          className="pb-1"
        >
          {rows}
        </SheetLite>
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Config"
          title="Config (font, toolbar, saves, colours)"
          className="cursor-pointer rounded-full p-3 md:mt-10 md:p-0.5"
        >
          <SolarIcon icon="config" className="size-4 pointer-events-none text-foreground/70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 rounded-xl border-border/60 p-1.5 shadow-lg"
        align="end"
        side="top"
        collisionPadding={16}
      >
        {rows}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
