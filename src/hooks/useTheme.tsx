import { useEffect, useState } from 'react';

export type Theme = 'lilla' | 'ocean' | 'sunset' | 'forest' | 'sky' | 'pearl' | 'mint';

const THEME_STORAGE_KEY = 'crm-theme';
const TEXT_MODE_STORAGE_KEY = 'crm-text-mode';

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
  },
  pearl: {
    name: 'Pearl',
    description: 'Tema chiaro elegante',
    className: 'theme-pearl'
  },
  mint: {
    name: 'Mint',
    description: 'Verde menta fresco',
    className: 'theme-mint'
  }
} as const;

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return (saved as Theme) || 'lilla';
  });

  const [darkText, setDarkTextState] = useState<boolean>(() => {
    const saved = localStorage.getItem(TEXT_MODE_STORAGE_KEY);
    return saved === 'true';
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Rimuove tutte le classi tema
    Object.values(themes).forEach(t => {
      if (t.className) {
        root.classList.remove(t.className);
      }
    });

    // Aggiunge la classe del tema corrente
    const themeClassName = themes[theme].className;
    if (themeClassName) {
      root.classList.add(themeClassName);
    }

    // Gestisce la modalità testo
    if (darkText) {
      root.classList.add('dark-text-mode');
    } else {
      root.classList.remove('dark-text-mode');
    }

    // Salva in localStorage
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    localStorage.setItem(TEXT_MODE_STORAGE_KEY, darkText.toString());
  }, [theme, darkText]);

  return {
    theme,
    setTheme: setThemeState,
    darkText,
    setDarkText: setDarkTextState,
    themes
  };
}
