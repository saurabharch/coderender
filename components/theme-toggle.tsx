"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  return (
    <button
      type="button"
      aria-label={`Theme: ${theme ?? "system"}. Switch to ${next}.`}
      onClick={() => setTheme(next)}
      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-black/10 dark:border-white/15"
    >
      <Icon size={18} />
    </button>
  );
}
