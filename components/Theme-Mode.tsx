"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dark } from "./icons/Dark";

export function ModeToggle() {
  const [mounted, setMounted] = useState(false);
  // We grab resolvedTheme to know exactly what is rendering on the screen
  const { setTheme, resolvedTheme } = useTheme();

  // Wait until mounted on client to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    // Toggle based on the active resolved theme
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" disabled>
        <span className="h-[1.2rem] w-[1.2rem]" />
      </Button>
    );
  }

  return (
    <Button variant="outline" size="icon" onClick={toggleTheme}>
      <Sun
        className={`h-[1.2rem] w-[1.2rem] transition-all ${
          resolvedTheme === "dark" ? "hidden" : "block"
        }`}
      />
      <Dark
        className={`h-[1.2rem] w-[1.2rem] transition-all ${
          resolvedTheme === "dark" ? "block" : "hidden"
        }`}
      />
    </Button>
  );
}
