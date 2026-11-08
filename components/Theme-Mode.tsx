"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { SolarIcon } from "@/lib/icons";

export const ModeToggle = React.memo(function ModeToggle() {
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" disabled aria-label="Toggle theme" title="Toggle theme">
        <span className="size-[1.2rem]" />
      </Button>
    );
  }

  return (
    <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme">
      <SolarIcon icon={resolvedTheme === "dark" ? "moon" : "sun"} className="size-[1.2rem]" />
    </Button>
  );
});
