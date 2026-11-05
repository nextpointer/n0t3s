"use client";

import { useEffect } from "react";
import toast from "react-hot-toast";

/**
 * Registers public/sw.js (production only) and surfaces a new deploy as
 * a toast the user can act on — nothing reloads until they say so. The
 * worker itself only caches the app shell; user data lives in IndexedDB
 * and is untouched from here.
 */
export function PwaInit() {
  useEffect(() => {
    // Dev keeps bypassing the worker entirely: stale cached chunks
    // would fight Turbopack's hot reloads and poison development.
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    // A controllerchange fires twice in this app's life: when the very
    // first worker claims an already-loaded page (harmless — the page
    // loaded fine without it), and when an accepted update activates.
    // Only the second needs a reload, so snapshot whether a controller
    // existed BEFORE registering — once the event fires, controller is
    // already the new one and the distinction is lost.
    const hadControllerAtStart = !!navigator.serviceWorker.controller;
    let reloading = false;
    const onControllerChange = () => {
      if (reloading || !hadControllerAtStart) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        // First install is silent — the controller gate below keeps it
        // so. Only a *new* version arriving under an existing one is
        // worth interrupting the user for.
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (
              installing.state !== "installed" ||
              !navigator.serviceWorker.controller
            ) {
              return;
            }
            toast(
              (t) => (
                <span className="flex items-center gap-3 text-sm">
                  <span className="flex-1">N0T3S updated — reload to apply</span>
                  <button
                    type="button"
                    onClick={() => {
                      toast.dismiss(t.id);
                      // The worker finishes installing when it updates.
                      navigator.serviceWorker.controller?.postMessage(
                        "SKIP_WAITING",
                      );
                      // controllerchange above reloads the page once.
                    }}
                    className="rounded-md bg-foreground px-2.5 py-1 text-background text-xs font-medium hover:opacity-90 transition-opacity"
                  >
                    Reload
                  </button>
                  <button
                    type="button"
                    aria-label="Dismiss"
                    title="Keep running the current version"
                    onClick={() => toast.dismiss(t.id)}
                    className="text-muted-foreground hover:text-foreground text-xs leading-none"
                  >
                    ✕
                  </button>
                </span>
              ),
              {
                id: "n0t3s-update-available",
                duration: Infinity,
                position: "bottom-center",
              },
            );
          });
        });
      })
      .catch(() => {
        // Registration failing (private mode, quota…) must never
        // disturb the app: offline support is progressive.
      });

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  return null;
}
