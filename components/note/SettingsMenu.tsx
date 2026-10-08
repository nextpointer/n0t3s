"use client";

import { memo, useCallback } from "react";
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

  const setDeleteDialogOpen = useSetAtom(deleteDialogOpenAtom);
  const setExportDialogOpen = useSetAtom(exportDialogOpenAtom);

  const handleDelete = useCallback(() => {
    setDeleteDialogOpen(true);
  }, [setDeleteDialogOpen]);

  const handleExport = useCallback(() => {
    setExportDialogOpen(true);
  }, [setExportDialogOpen]);

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
      <DropdownMenuContent className="w-44 rounded-xl" align="end">
        <div className="flex items-center justify-between px-2 py-1.5">
          <Label htmlFor="auto-save" className="text-sm">
            Auto Save
          </Label>
          <Switch
            id="auto-save"
            checked={autoSave}
            onCheckedChange={handleAutoSaveChange}
          />
        </div>
        <div className="flex items-center justify-between px-2 py-1.5">
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
        <div className="px-2 py-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="font-size" className="text-sm">
              Font size
            </Label>
            <span className="text-xs tabular-nums text-muted-foreground">
              {fontSize}px
            </span>
          </div>
          <input
            id="font-size"
            type="range"
            min={12}
            max={22}
            step={1}
            value={fontSize}
            onChange={(e) => handleFontSize(Number(e.target.value))}
            aria-label="Editor font size in pixels"
            title="Editor font size"
            className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary
                       [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary
                       [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-transform
                       hover:[&::-webkit-slider-thumb]:scale-110
                       [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full
                       [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary"
          />
        </div>
        <div className="flex items-center justify-between px-2 py-1.5">
          <Label htmlFor="ai-enabled" className="text-sm">
            No AI
          </Label>
          <Switch
            id="ai-enabled"
            checked={!aiEnabled}
            onCheckedChange={(on) => handleAiChange(!on)}
          />
        </div>
        <DropdownMenuSeparator />
        {/*<DropdownMenuItem
          onClick={() => setZenMode((prev) => !prev)}
          className="flex justify-center items-center rounded-xs"
        >
          <Zen className="size-4" />
          Zen Mode
        </DropdownMenuItem>
        <DropdownMenuSeparator />*/}
        {/*<DropdownMenuItem
          onClick={handleImport}
          className="flex justify-center items-center  rounded-xs"
        >
          <Import className="w-4 h-4" />
          Import
        </DropdownMenuItem>
        <DropdownMenuSeparator />*/}
        <DropdownMenuItem
          onClick={handleExport}
          className="flex justify-center items-center rounded-xs"
        >
          <Export className="w-4 h-4" />
          Export Note
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDelete}
          className="text-destructive focus:text-destructive flex justify-center items-center rounded-ss-xs rounded-se-xs"
        >
          <Trash2 className="w-4 h-4" />
          Delete Note
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
