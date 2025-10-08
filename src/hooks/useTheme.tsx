import { useEffect, useState } from 'react';

export type Theme = 'lilla' | 'gold' | 'platinum' | 'emerald' | 'royal' | 'sapphire' | 'ruby' | 'onyx';

const THEME_STORAGE_KEY = 'crm-theme';

export const themes = {
  lilla: {
    name: 'Lilla',
    description: 'Tema predefinito con tonalità blu e viola',
    className: ''
  },
  gold: {
    name: 'Gold',
    description: 'Oro elegante e raffinato',
    className: 'theme-gold'
  },
  platinum: {
    name: 'Platinum',
    description: 'Platino lucido e sofisticato',
    className: 'theme-platinum'
  },
  emerald: {
    name: 'Emerald',
    description: 'Smeraldo prezioso e vibrante',
    className: 'theme-emerald'
  },
  royal: {
    name: 'Royal',
    description: 'Viola reale maestoso',
    className: 'theme-royal'
  },
  sapphire: {
    name: 'Sapphire',
    description: 'Zaffiro blu intenso',
    className: 'theme-sapphire'
  },
  ruby: {
    name: 'Ruby',
    description: 'Rubino rosa passionale',
    className: 'theme-ruby'
  },
  onyx: {
    name: 'Onyx',
    description: 'Onice nero profondo',
    className: 'theme-onyx'
  }
} as const;

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return (saved as Theme) || 'lilla';
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

    // Salva in localStorage
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return {
    theme,
    setTheme: setThemeState,
    themes
  };
}
