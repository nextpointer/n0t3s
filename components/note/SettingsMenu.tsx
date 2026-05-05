"use client";

import { memo, useCallback } from "react";
import { useAtom, useSetAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { Settings, Trash2 } from "lucide-react";
import { Import } from "@/components/icons/Import";
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
  deleteDialogOpenAtom,
  exportDialogOpenAtom,
  importDialogOpenAtom,
  zenMode,
} from "@/store/noteAtom";
import { Zen } from "../icons/Zen";

export const SettingsMenu = memo(function SettingsMenu() {
  const [autoSave, setAutoSave] = useAtom(autoSaveAtom);
  const [zen, setZenMode] = useAtom(zenMode);
  const setDeleteDialogOpen = useSetAtom(deleteDialogOpenAtom);
  const setImportDialogOpen = useSetAtom(importDialogOpenAtom);
  const setExportDialogOpen = useSetAtom(exportDialogOpenAtom);

  const handleDelete = useCallback(() => {
    setDeleteDialogOpen(true);
  }, [setDeleteDialogOpen]);

  const handleImport = useCallback(() => {
    setImportDialogOpen(true);
  }, [setImportDialogOpen]);

  const handleExport = useCallback(() => {
    setExportDialogOpen(true);
  }, [setExportDialogOpen]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 pr-2">
          <Settings className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-36 rounded-xl" align="end">
        <div className="flex items-center justify-between px-2 py-1.5">
          <Label htmlFor="auto-save" className="text-sm">
            Auto Save
          </Label>
          <Switch
            id="auto-save"
            checked={autoSave}
            onCheckedChange={setAutoSave}
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
