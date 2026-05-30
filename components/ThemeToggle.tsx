'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { useCallback } from 'react';
import { cn } from '@/lib/utils/cn';

export function ThemeToggle() {
  const { isDark, setTheme, mounted } = useTheme();

  const handleThemeChange = useCallback(async (newTheme: string) => {
    setTheme(newTheme);
    
    // Save preference to database
    try {
      await fetch('/api/v1/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      });
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  }, [setTheme]);

  if (!mounted) {
    return (
      <div className="w-8 h-8 bg-muted rounded-lg animate-pulse" />
    );
  }

  return (
    <button
      onClick={() => handleThemeChange(isDark ? 'light' : 'dark')}
      className={cn(
        "inline-flex items-center justify-center rounded-lg border border-input bg-background",
        "px-3 py-2 text-sm font-medium hover:bg-primary hover:text-accent-foreground",
        "focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
      )}
      aria-label="Toggle theme"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
