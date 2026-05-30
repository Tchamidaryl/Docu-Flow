"use client";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: "light", icon: Sun },
    { value: "system", icon: Monitor },
    { value: "dark", icon: Moon },
  ];

  return (
    <div className={cn("flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1", className)}>
      {options.map(({ value, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            "p-1.5 rounded-md transition-all",
            theme === value
              ? "bg-white dark:bg-slate-600 shadow-sm text-brand-600 dark:text-brand-400"
              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          )}
          title={value}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}
