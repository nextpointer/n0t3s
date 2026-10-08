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
  deleteDialogOpenAtom,
  exportDialogOpenAtom,
  persistAutoSave,
  persistAiEnabled,
} from "@/store/noteAtom";

export const SettingsMenu = memo(function SettingsMenu() {
  const [autoSave, setAutoSave] = useAtom(autoSaveAtom);
  const [aiEnabled, setAiEnabled] = useAtom(aiEnabledAtom);

  const handleAutoSaveChange = useCallback((value: boolean) => {
    setAutoSave(value);
    persistAutoSave(value);
  }, [setAutoSave]);

  const handleAiChange = useCallback((value: boolean) => {
    setAiEnabled(value);
    persistAiEnabled(value);
  }, [setAiEnabled]);

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
      <DropdownMenuContent className="w-40 rounded-xl" align="end">
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
