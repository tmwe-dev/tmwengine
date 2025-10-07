import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

/**
 * ThemeToggle - Toggle per switchare tra versione DIURNA e NOTTURNA
 * 
 * @example
 * ```tsx
 * <ThemeToggle />
 * ```
 */

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Leggi la preferenza salvata o usa 'light' come default
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light';
    setTheme(savedTheme);
    
    // Applica la classe al DOM
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    // Salva la preferenza
    localStorage.setItem('theme', newTheme);
    
    // Applica la classe al DOM
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-8 w-8"
      title={theme === 'light' ? 'Passa alla versione NOTTURNA' : 'Passa alla versione DIURNA'}
    >
      {theme === 'light' ? (
        <Sun className="h-5 w-5 text-foreground" />
      ) : (
        <Moon className="h-5 w-5 text-foreground" />
      )}
    </Button>
  );
}
