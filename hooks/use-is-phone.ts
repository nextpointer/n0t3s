"use client";

import { useEffect, useState } from "react";

/**
 * Whether the viewport is phone-sized (the palette/settings sheet
 * breakpoint). Resolves to the desktop shape until hydration, matching
 * the server render.
 */
export function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return isPhone;
}
