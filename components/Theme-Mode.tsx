"use client";

import { useTheme } from "next-themes";
import { Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dark } from "./icons/Dark";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Button variant="outline" size="icon" onClick={toggleTheme}>
      <Sun
        className={`h-[1.2rem] w-[1.2rem] transition-all ${
          theme === "dark" ? "hidden" : "block"
        }`}
      />
      <Dark
        className={`h-[1.2rem] w-[1.2rem] transition-all ${
          theme === "dark" ? "block" : "hidden"
        }`}
      />
    </Button>
  );
}
