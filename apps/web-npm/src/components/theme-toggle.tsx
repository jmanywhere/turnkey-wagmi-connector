"use client";

import { useLayoutEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  const domIsDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");
  const isDark =
    resolvedTheme === "dark" ||
    (resolvedTheme === undefined && mounted && domIsDark);

  const toggle = () => {
    setTheme(
      document.documentElement.classList.contains("dark") ? "light" : "dark",
    );
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      className={cn("shrink-0 touch-manipulation", className)}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
