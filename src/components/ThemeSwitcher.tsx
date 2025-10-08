import { Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme, Theme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

export function ThemeSwitcher() {
  const { theme, setTheme, themes } = useTheme();

  const themeColors: Record<Theme, string> = {
    lilla: 'bg-gradient-to-r from-blue-500 to-purple-600',
    gold: 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600',
    platinum: 'bg-gradient-to-r from-slate-300 via-slate-100 to-slate-300',
    emerald: 'bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600',
    royal: 'bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-700',
    sapphire: 'bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600',
    ruby: 'bg-gradient-to-r from-rose-500 via-pink-400 to-rose-600',
    onyx: 'bg-gradient-to-r from-gray-800 via-slate-700 to-gray-900'
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Palette className="h-4 w-4" />
          <span className="sr-only">Cambia tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
        <DropdownMenuLabel>Seleziona Tema</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.entries(themes).map(([key, value]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => setTheme(key as Theme)}
            className={cn(
              'cursor-pointer',
              theme === key && 'bg-accent'
            )}
          >
            <div className="flex items-center gap-3 w-full">
              <div className={cn(
                'w-6 h-6 rounded-full',
                themeColors[key as Theme]
              )} />
              <div className="flex-1">
                <div className="font-medium">{value.name}</div>
                <div className="text-xs text-muted-foreground">
                  {value.description}
                </div>
              </div>
              {theme === key && (
                <div className="w-2 h-2 rounded-full bg-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
