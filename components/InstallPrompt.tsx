"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const SEEN_KEY = "n0t3s-install-prompt-seen";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

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

    const t = window.setTimeout(() => setVisible(true), 800);
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

  const dismiss = () => {
    markSeen();
    setVisible(false);
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
        setVisible(false);
      }
      return;
    }
    if (ios) {
      toast("Tap Share → Add to Home Screen", { icon: "✨", duration: 3500 });
    } else {
      toast("Install from your browser menu", { icon: "✨", duration: 3000 });
    }
    markSeen();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-0 z-[60] flex justify-center px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="pointer-events-auto inline-flex max-w-full items-center gap-2 rounded-full border border-border/60 bg-background/90 px-2 py-1.5 shadow-sm backdrop-blur-md">
        <button
          type="button"
          onClick={() => void install()}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
        >
          <span aria-hidden>⬇️</span>
          <span>Install app</span>
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
