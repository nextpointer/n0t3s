"use client";

import { memo, useCallback } from "react";
import { useAtom, useSetAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { Settings, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { autoSaveAtom, deleteDialogOpenAtom } from "@/store/noteAtom";

export const SettingsMenu = memo(function SettingsMenu() {
  const [autoSave, setAutoSave] = useAtom(autoSaveAtom);
  const setDeleteDialogOpen = useSetAtom(deleteDialogOpenAtom);

  const handleDelete = useCallback(() => {
    setDeleteDialogOpen(true);
  }, [setDeleteDialogOpen]);

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
        <DropdownMenuItem
          onClick={handleDelete}
          className="text-destructive focus:text-destructive flex justify-center items-center rounded-2xl"
        >
          <Trash2 className="w-4 h-4" />
          Delete Note
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
