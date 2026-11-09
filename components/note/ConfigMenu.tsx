"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { useAtom } from "jotai";
import { useTheme } from "next-themes";
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
import { cn } from "@/lib/utils";
import {
  autoSaveAtom,
  aiEnabledAtom,
  previewColorsAtom,
  editorFontSizeAtom,
  toolbarEnabledAtom,
  spellCheckAtom,
  persistAutoSave,
  persistAiEnabled,
  persistPreviewColors,
  persistEditorFontSize,
  persistToolbarEnabled,
  persistSpellCheck,
} from "@/store/noteAtom";

/**
 * Editor preferences: appearance, writing surface and behaviour. Separate
 * from Settings, which is the destructive/document pair (export, delete).
 */
export const ConfigMenu = memo(function ConfigMenu() {
  const [autoSave, setAutoSave] = useAtom(autoSaveAtom);
  const [aiEnabled, setAiEnabled] = useAtom(aiEnabledAtom);
  const [previewColors, setPreviewColors] = useAtom(previewColorsAtom);
  const [fontSize, setFontSize] = useAtom(editorFontSizeAtom);
  const [toolbarEnabled, setToolbarEnabled] = useAtom(toolbarEnabledAtom);
  const [spellCheck, setSpellCheck] = useAtom(spellCheckAtom);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isPhone = useIsPhone();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

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

  const handleSpellCheck = useCallback((value: boolean) => {
    setSpellCheck(value);
    persistSpellCheck(value);
  }, [setSpellCheck]);

  const dark = mounted && resolvedTheme === "dark";

  const rows = (
    <div className="px-1.5 pt-3 pb-1 min-w-[220px]">
      <div className="px-2.5 pb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40">
        Appearance
      </div>
      <div className="mx-1.5 mb-2 flex items-center gap-1 rounded-lg bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setTheme("light")}
          aria-pressed={mounted && !dark}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors",
            mounted && !dark ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <SolarIcon icon="sun" className="size-3.5" /> Light
        </button>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          aria-pressed={mounted && dark}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors",
            mounted && dark ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <SolarIcon icon="moon" className="size-3.5" /> Dark
        </button>
      </div>

      <div className="px-2.5 pt-1 pb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40">
        Editor
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
        <Label htmlFor="show-toolbar" className="text-sm">Show toolbar</Label>
        <Switch id="show-toolbar" checked={toolbarEnabled} onCheckedChange={handleToolbarToggle} />
      </div>
      <div className="flex items-center justify-between gap-6 px-2.5 py-2.5">
        <Label htmlFor="config-spell-check" className="text-sm">Spell check</Label>
        <Switch id="config-spell-check" checked={spellCheck} onCheckedChange={handleSpellCheck} />
      </div>
      <div className="flex items-center justify-between gap-6 px-2.5 py-2.5">
        <Label htmlFor="config-auto-save" className="text-sm">Auto Save</Label>
        <Switch id="config-auto-save" checked={autoSave} onCheckedChange={handleAutoSaveChange} />
      </div>
      <div className="flex items-center justify-between gap-6 px-2.5 py-2.5">
        <Label htmlFor="config-preview-colors" className="text-sm">Preview colours</Label>
        <Switch id="config-preview-colors" checked={previewColors} onCheckedChange={handlePreviewColors} />
      </div>
      <div className="flex items-center justify-between gap-6 px-2.5 py-2.5">
        <Label htmlFor="config-ai-enabled" className="text-sm">No AI</Label>
        <Switch id="config-ai-enabled" checked={!aiEnabled} onCheckedChange={(on) => handleAiChange(!on)} />
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
          title="Config (appearance, font, toolbar, saves)"
          className="cursor-pointer rounded-full p-2.5 md:mt-10 md:p-1 text-foreground/45 transition-colors hover:text-foreground/90"
        >
          <SolarIcon icon="config" className="size-[15px] pointer-events-none" />
        </button>
        <SheetLite open={sheetOpen} onClose={() => setSheetOpen(false)} className="pb-1">
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
          title="Config (appearance, font, toolbar, saves)"
          className="cursor-pointer rounded-full p-2.5 md:mt-10 md:p-1 text-foreground/45 transition-colors hover:text-foreground/90"
        >
          <SolarIcon icon="config" className="size-[15px] pointer-events-none" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-64 rounded-xl border-border/60 p-1.5 shadow-lg"
        align="end"
        side="top"
        sideOffset={10}
        collisionPadding={16}
      >
        {rows}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
