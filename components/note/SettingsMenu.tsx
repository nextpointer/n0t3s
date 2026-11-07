"use client";

import { memo, useCallback, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { Settings, Trash2 } from "lucide-react";
import { Export } from "@/components/icons/Export";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ElasticSlider } from "@/components/ui/elastic-slider";
import { useIsPhone } from "@/hooks/use-is-phone";
import {
  autoSaveAtom,
  aiEnabledAtom,
  previewColorsAtom,
  editorFontSizeAtom,
  deleteDialogOpenAtom,
  exportDialogOpenAtom,
  persistAutoSave,
  persistAiEnabled,
  persistPreviewColors,
  persistEditorFontSize,
} from "@/store/noteAtom";

export const SettingsMenu = memo(function SettingsMenu() {
  const [autoSave, setAutoSave] = useAtom(autoSaveAtom);
  const [aiEnabled, setAiEnabled] = useAtom(aiEnabledAtom);
  const [previewColors, setPreviewColors] = useAtom(previewColorsAtom);
  const [fontSize, setFontSize] = useAtom(editorFontSizeAtom);
  const setDeleteDialogOpen = useSetAtom(deleteDialogOpenAtom);
  const setExportDialogOpen = useSetAtom(exportDialogOpenAtom);
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

  const handleDelete = useCallback(() => {
    setSheetOpen(false);
    setDeleteDialogOpen(true);
  }, [setDeleteDialogOpen]);

  const handleExport = useCallback(() => {
    setSheetOpen(false);
    setExportDialogOpen(true);
  }, [setExportDialogOpen]);

  // The same control surface renders in the desktop dropdown and the
  // phone sheet — one spacing rhythm, one source for every atom.
  const toggles = (
    <>
      <div className="flex items-center justify-between gap-6 px-2.5 py-2.5">
        <Label htmlFor="auto-save" className="text-sm">
          Auto Save
        </Label>
        <Switch
          id="auto-save"
          checked={autoSave}
          onCheckedChange={handleAutoSaveChange}
        />
      </div>
      <div className="flex items-center justify-between gap-6 px-2.5 py-2.5">
        <Label htmlFor="preview-colors" className="text-sm">
          Preview colours
        </Label>
        <Switch
          id="preview-colors"
          checked={previewColors}
          onCheckedChange={handlePreviewColors}
          title="Coloured headings and emphasis in preview. Code blocks stay highlighted either way."
        />
      </div>
      <div className="flex items-center justify-between gap-6 px-2.5 py-2.5">
        <Label htmlFor="ai-enabled" className="text-sm">
          No AI
        </Label>
        <Switch
          id="ai-enabled"
          checked={!aiEnabled}
          onCheckedChange={(on) => handleAiChange(!on)}
        />
      </div>
    </>
  );

  const fontSlider = (
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
  );

  // Phones: a bottom sheet, consistent with the palette's, with its own
  // drag handle and safe-area clearance. The export/delete actions close
  // the sheet first so their dialogs open over the page, not over it.
  if (isPhone) {
    return (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 pr-2"
            aria-label="Settings"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="gap-0 overflow-hidden rounded-t-2xl border-border/60 px-1 pt-0 pb-1"
        >
          <div
            aria-hidden
            className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-muted-foreground/30"
          />
          <div className="px-1.5 pt-3 pb-1">
            <div className="px-2.5 pb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40">
              Settings
            </div>
            {toggles}
            {fontSlider}
          </div>
          <div className="grid grid-cols-2 gap-2 px-3 pb-2 pt-2 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleExport}
            >
              <Export className="w-4 h-4" />
              Export
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
          <div
            aria-hidden
            className="h-2 shrink-0 pb-[env(safe-area-inset-bottom)]"
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 pr-2"
          aria-label="Settings"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 rounded-xl border-border/60 p-1.5 shadow-lg"
        align="end"
      >
        {toggles}
        {fontSlider}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleExport}
          className="flex justify-center items-center gap-2 rounded-lg py-2"
        >
          <Export className="w-4 h-4" />
          Export Note
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDelete}
          className="text-destructive focus:text-destructive flex justify-center items-center gap-2 rounded-lg py-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete Note
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
