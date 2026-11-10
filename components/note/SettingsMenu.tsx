"use client";

import { memo, useCallback, useState } from "react";
import { useSetAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { SolarIcon } from "@/lib/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SheetLite } from "@/components/ui/sheet-lite";
import { useIsPhone } from "@/hooks/use-is-phone";
import {
  deleteDialogOpenAtom,
  exportDialogOpenAtom,
} from "@/store/noteAtom";

/**
 * Document-level actions for the open note: export and delete.
 * Deliberately a short destructive pair — editor preferences (font size,
 * toolbar, saves, colours, No AI) live in the Config menu, which used to
 * make removing a note sit two rows under a font slider.
 */
export const SettingsMenu = memo(function SettingsMenu() {
  const setDeleteDialogOpen = useSetAtom(deleteDialogOpenAtom);
  const setExportDialogOpen = useSetAtom(exportDialogOpenAtom);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isPhone = useIsPhone();

  const handleDelete = useCallback(() => {
    setSheetOpen(false);
    setDeleteDialogOpen(true);
  }, [setDeleteDialogOpen]);

  const handleExport = useCallback(() => {
    setSheetOpen(false);
    setExportDialogOpen(true);
  }, [setExportDialogOpen]);

  // Phones: a bottom sheet, consistent with the palette's, with its own
  // drag handle and safe-area clearance. The export/delete actions close
  // the sheet first so their dialogs open over the page, not over it.
  if (isPhone) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 pr-2"
          aria-label="Settings"
          title="Settings (export, delete)"
          onClick={() => setSheetOpen(true)}
        >
          <SolarIcon icon="settings" className="w-4 h-4" />
        </Button>
        <SheetLite
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          className="gap-0 px-1 pt-0 pb-1"
        >
          <div className="px-1.5 pt-3 pb-1">
            <div className="px-2.5 pb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40">
              Settings
            </div>
            <div className="px-2.5 py-2 text-sm text-muted-foreground/70">
              Export this note, or remove it from your device permanently.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 px-3 pb-2 pt-2 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleExport}
            >
              <SolarIcon icon="export" className="w-4 h-4" />
              Export
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={handleDelete}
            >
              <SolarIcon icon="delete" className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </SheetLite>
      </>
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
          title="Settings (export, delete)"
        >
          <SolarIcon icon="settings" className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-42 rounded-xl border-border/60 p-1.5 shadow-lg"
        align="end"
      >
        <DropdownMenuItem
          onClick={handleExport}
          className="flex justify-center items-center gap-2 rounded-b-none py-2"
        >
          <SolarIcon icon="export" className="w-4 h-4" />
          Export Note
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDelete}
          className="text-destructive focus:text-destructive flex justify-center items-center gap-2 rounded-t-none py-2"
        >
          <SolarIcon icon="delete" className="w-4 h-4" />
          Delete Note
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
