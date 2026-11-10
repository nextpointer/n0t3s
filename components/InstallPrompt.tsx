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
    if (deferred) {
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
      return;
    }
    // No native prompt available (e.g. iOS/manual install) — acknowledge and close.
    close();
  };

  if (!ready) return null;

  const description = ios
    ? "Get the full app experience ✨ Tap Share → “Add to Home Screen” to install N0T3S on your iPhone/iPad."
    : deferred
      ? "Get faster access, a cleaner full-screen experience, and your notes just one tap away. ✨"
      : "Install N0T3S from your browser menu for quick access and a smooth, app-like experience. ✨";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); else setOpen(true); }}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[calc(100%-2rem)] overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-b from-background via-background to-background/95 p-0 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.45)] ring-1 ring-white/10 sm:max-w-sm dark:border-white/10"
      >
        <div className="relative px-5 pb-5 pt-6">
          <div className="pointer-events-none absolute -top-10 left-1/2 h-28 w-40 -translate-x-1/2 rounded-full bg-foreground/10 blur-2xl" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/20" />
          <DialogHeader className="relative space-y-3 text-center sm:text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/30 bg-gradient-to-br from-foreground/[0.08] to-foreground/[0.02] text-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_8px_24px_-12px_rgba(0,0,0,0.45)] backdrop-blur-sm">
              ✨
            </div>
            <DialogTitle className="text-xl font-semibold tracking-tight">
              Install N0T3S
            </DialogTitle>
            <DialogDescription className="mx-auto max-w-[30ch] text-[13px] leading-relaxed text-muted-foreground">
              {description}
            </DialogDescription>
          </DialogHeader>
          <div className="relative mt-5 flex flex-col gap-2">
            <Button
              className="h-11 rounded-full bg-foreground text-background shadow-[0_8px_20px_-10px_rgba(0,0,0,0.6)] transition-transform hover:scale-[1.01] hover:bg-foreground/90"
              onClick={() => void install()}
            >
              {deferred ? "Install App 🚀" : ios ? "Got it 👍" : "Install App"}
            </Button>
            <Button
              variant="ghost"
              className="h-10 rounded-full text-muted-foreground hover:text-foreground"
              onClick={close}
            >
              Maybe later
            </Button>
          </div>
          <p className="mt-3 text-center text-[11px] text-muted-foreground/70">
            Fast • Minimal • Premium notes experience
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
