'use client';

import { useTheme as useNextTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface UseThemeReturn {
  theme: string | undefined;
  setTheme: (theme: string) => void;
  isDark: boolean;
  isLight: boolean;
  mounted: boolean;
}

export function useTheme(): UseThemeReturn {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useNextTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return {
      theme: undefined,
      setTheme,
      isDark: false,
      isLight: true,
      mounted: false,
    };
  }

  return {
    theme,
    setTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    mounted: true,
  };
}
