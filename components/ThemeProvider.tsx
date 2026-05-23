'use client';
import { useEffect } from 'react';
import { getSavedTheme, applyThemeToBody, LS_KEY, ThemeId, THEME_IDS } from '@/lib/theme';

export default function ThemeProvider() {
  useEffect(() => {
    // Apply saved theme on mount (no flash because layout has inline script)
    applyThemeToBody(getSavedTheme());

    // React to theme changes (from profile page or other tabs)
    function onStorage(e: StorageEvent) {
      if (e.key === LS_KEY && e.newValue) {
        const id = e.newValue as ThemeId;
        if (THEME_IDS.includes(id)) applyThemeToBody(id);
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return null;
}
