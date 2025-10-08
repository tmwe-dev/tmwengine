import { useEffect, useState } from 'react';

export type Theme = 'lilla' | 'ocean' | 'sunset' | 'forest' | 'sky';

const THEME_STORAGE_KEY = 'crm-theme';

export const themes = {
  lilla: {
    name: 'Lilla',
    description: 'Tema predefinito con tonalità blu e viola',
    className: ''
  },
  ocean: {
    name: 'Ocean',
    description: 'Tonalità teal e coral',
    className: 'theme-ocean'
  },
  sunset: {
    name: 'Sunset',
    description: 'Arancione caldo e viola',
    className: 'theme-sunset'
  },
  forest: {
    name: 'Forest',
    description: 'Verde smeraldo e marrone',
    className: 'theme-forest'
  },
  sky: {
    name: 'Sky',
    description: 'Azzurro cielo e giallo solare',
    className: 'theme-sky'
  }
} as const;

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return (saved as Theme) || 'lilla';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (!root) return;
    
    // Rimuove tutte le classi tema
    Object.values(themes).forEach(t => {
      if (t && t.className) {
        root.classList.remove(t.className);
      }
    });

    // Aggiunge la classe del tema corrente
    const currentTheme = themes[theme];
    if (currentTheme && currentTheme.className) {
      root.classList.add(currentTheme.className);
    }

    // Salva in localStorage
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return {
    theme,
    setTheme: setThemeState,
    themes
  };
}
