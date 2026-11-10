"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SolarIcon } from "@/lib/icons";

const SEEN_KEY = "n0t3s-install-prompt-seen";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

export function InstallPrompt() {
  const [open, setOpen] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ready, setReady] = useState(false);

  const ios = useMemo(() => isIos(), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (isStandalone()) {
        localStorage.setItem(SEEN_KEY, "1");
        return;
      }
      if (localStorage.getItem(SEEN_KEY)) return;
    } catch {
      return;
    }

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault?.();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    // Show once for first-time users (desktop and phone). Delay slightly so it doesn't fight initial load.
    const t = window.setTimeout(() => {
      setReady(true);
      setOpen(true);
    }, 1200);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  const markSeen = () => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}
  };

  const close = () => {
    markSeen();
    setOpen(false);
  };

  const install = async () => {
    if (!deferred) {
      close();
      return;
    }
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      // ignore
    } finally {
      setDeferred(null);
      markSeen();
      setOpen(false);
    }
  };

  if (!ready) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); else setOpen(true); }}>
      <DialogContent showCloseButton={false} className="max-w-[calc(100%-2rem)] rounded-2xl p-5 sm:max-w-sm">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-foreground/[0.06]">
              <SolarIcon icon="export" className="size-4 text-foreground/80" />
            </div>
            <DialogTitle className="text-base">Install N0T3S</DialogTitle>
          </div>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            {ios
              ? "Install this app on your device for a faster, app-like experience. On iPhone/iPad: tap Share, then “Add to Home Screen”."
              : deferred
                ? "Install this app on your device for quick access and a better full-screen experience."
                : "Install this app from your browser menu for quick access and a better app-like experience."}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" className="rounded-full" onClick={close}>
            Not now
          </Button>
          {deferred ? (
            <Button className="rounded-full" onClick={() => void install()}>
              Install
            </Button>
          ) : (
            <Button className="rounded-full" onClick={close}>
              Got it
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
